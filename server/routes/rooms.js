const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { supabase, toApi, toApiList } = require('../config/supabase');
const { protect } = require('../middleware/auth');

// ─── Max limits ───
const MAX_ROOMS_PER_USER = Number(process.env.MAX_ROOMS_PER_USER || 10);
const MAX_MEMBERS_PER_ROOM = Number(process.env.MAX_MEMBERS_PER_ROOM || 100);

// ===========================================================================
// POST /api/rooms — Create a new room
// ===========================================================================
router.post('/', protect, async (req, res) => {
  try {
    const { name, description = '', topic = '', is_public = true } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Vui long nhap ten phong' });
    }

    // Check room limit
    const { count } = await (req.supabase || supabase).from('rooms')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', req.user.id);

    if (count >= MAX_ROOMS_PER_USER) {
      return res.status(400).json({ error: `Ban chi co the tao toi da ${MAX_ROOMS_PER_USER} phong` });
    }

    // Create room
    const invite_code = uuidv4().slice(0, 8).toUpperCase();
    const { data: room, error } = await (req.supabase || supabase).from('rooms')
      .insert({
        name: name.trim(),
        description,
        topic,
        is_public,
        invite_code,
        owner_id: req.user.id
      })
      .select('*')
      .single();

    if (error) throw error;

    // Add owner as member with 'owner' role
    const { data: member, error: memberError } = await (req.supabase || supabase).from('room_members')
      .insert({
        room_id: room.id,
        user_id: req.user.id,
        role: 'owner'
      })
      .select('*')
      .single();

    if (memberError) throw memberError;

    // Create default channel 'chat-chung'
    const { error: channelError } = await (req.supabase || supabase).from('room_channels')
      .insert({
        room_id: room.id,
        name: 'chat-chung',
        description: 'Tro chuyen chung',
        created_by: req.user.id
      });

    if (channelError) throw channelError;

    res.status(201).json({
      ...toApi(room),
      members: [{ ...toApi(member) }],
      channels: [{ id: 'pending', name: 'chat-chung' }]
    });
  } catch (error) {
    console.error('[Rooms /create]', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// GET /api/rooms — List all rooms (public + joined)
// ===========================================================================
router.get('/', protect, async (req, res) => {
  try {
    // Rooms user has joined
    const { data: myMemberships, error: membershipError } = await (req.supabase || supabase).from('room_members')
      .select('room_id, role')
      .eq('user_id', req.user.id);

    if (membershipError) throw membershipError;

    const myMembershipByRoom = new Map((myMemberships || []).map(m => [m.room_id, m]));
    const myRoomIds = Array.from(myMembershipByRoom.keys());

    // Public rooms everyone can discover.
    const { data: publicRooms, error: publicError } = await (req.supabase || supabase).from('rooms')
      .select('*, owner:owner_id(id, name, email, avatar_url)')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (publicError) throw publicError;

    // Private/public rooms already joined by this user must also be listed.
    let joinedRooms = [];
    if (myRoomIds.length > 0) {
      const { data, error } = await (req.supabase || supabase).from('rooms')
        .select('*, owner:owner_id(id, name, email, avatar_url)')
        .in('id', myRoomIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      joinedRooms = data || [];
    }

    const mergedRooms = new Map();
    for (const room of [...(publicRooms || []), ...joinedRooms]) {
      mergedRooms.set(room.id, room);
    }

    // Fetch member counts for each room
    const roomsWithCounts = await Promise.all(Array.from(mergedRooms.values()).map(async (room) => {
      const { count } = await (req.supabase || supabase).from('room_members')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', room.id);
      const membership = myMembershipByRoom.get(room.id);
      return {
        ...toApi(room),
        owner: room.owner ? { _id: room.owner.id, name: room.owner.name, avatar: room.owner.avatar_url || '' } : null,
        member_count: count || 0,
        is_member: Boolean(membership),
        my_role: membership?.role || null
      };
    }));

    roomsWithCounts.sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0));
    res.json(roomsWithCounts);
  } catch (error) {
    console.error('[Rooms /list]', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// GET /api/rooms/:id — Room detail (members, channels)
// ===========================================================================
router.get('/:id', protect, async (req, res) => {
  try {
    const { data: room, error } = await (req.supabase || supabase).from('rooms')
      .select('*, owner:owner_id(id, name, email, avatar_url)')
      .eq('id', req.params.id)
      .single();

    if (error || !room) {
      return res.status(404).json({ error: 'Khong tim thay phong' });
    }

    // Check membership
    const { data: myMembership } = await (req.supabase || supabase).from('room_members')
      .select('id, role, peer_points')
      .eq('room_id', room.id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    const detail = {
      ...toApi(room),
      owner: room.owner ? { _id: room.owner.id, name: room.owner.name, avatar: room.owner.avatar_url || '' } : null,
      my_role: myMembership?.role || null
    };

    // Only fetch members/channels if user is a member
    if (myMembership) {
      const { data: members } = await (req.supabase || supabase).from('room_members')
        .select('*, user:user_id(id, name, email, avatar_url)')
        .eq('room_id', room.id);

      const { data: channels } = await (req.supabase || supabase).from('room_channels')
        .select('*')
        .eq('room_id', room.id)
        .order('created_at', { ascending: true });

      detail.members = (members || []).map(m => ({
        _id: m.user?.id || m.user_id,
        user_id: m.user_id,
        name: m.user?.name || 'Unknown',
        email: m.user?.email || '',
        avatar: m.user?.avatar_url || '',
        role: m.role,
        peer_points: m.peer_points,
        joined_at: m.joined_at
      }));
      detail.channels = toApiList(channels);
    }

    const { count } = await (req.supabase || supabase).from('room_members')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', room.id);
    detail.member_count = count || 0;

    res.json(detail);
  } catch (error) {
    console.error('[Rooms /detail]', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// PUT /api/rooms/:id — Update room info (owner/admin only)
// ===========================================================================
router.put('/:id', protect, async (req, res) => {
  try {
    const { name, description, topic, is_public } = req.body;

    // Check permission
    const { data: member } = await (req.supabase || supabase).from('room_members')
      .select('role')
      .eq('room_id', req.params.id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({ error: 'Ban khong co quyen chinh sua phong nay' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description;
    if (topic !== undefined) updates.topic = topic;
    if (is_public !== undefined) updates.is_public = is_public;

    const { data: room, error } = await (req.supabase || supabase).from('rooms')
      .update(updates)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) throw error;
    res.json(toApi(room));
  } catch (error) {
    console.error('[Rooms /update]', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// DELETE /api/rooms/:id — Delete room (owner only)
// ===========================================================================
router.delete('/:id', protect, async (req, res) => {
  try {
    const { data: member } = await (req.supabase || supabase).from('room_members')
      .select('role')
      .eq('room_id', req.params.id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (!member || member.role !== 'owner') {
      return res.status(403).json({ error: 'Chi chu phong moi co the xoa phong' });
    }

    // Room cascade will delete members, channels, files
    const { error } = await (req.supabase || supabase).from('rooms')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('[Rooms /delete]', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// POST /api/rooms/join — Join room by invite code
// ===========================================================================
router.post('/join', protect, async (req, res) => {
  try {
    const { invite_code } = req.body;
    if (!invite_code) {
      return res.status(400).json({ error: 'Vui long nhap ma moi' });
    }

    // Find room
    const { data: room } = await (req.supabase || supabase).from('rooms')
      .select('*')
      .eq('invite_code', invite_code.trim().toUpperCase())
      .maybeSingle();

    if (!room) {
      return res.status(404).json({ error: 'Ma moi khong hop le' });
    }

    // Anyone with the correct invite code can join, even if the room is not public.

    // Check existing membership
    const { data: existing } = await (req.supabase || supabase).from('room_members')
      .select('id')
      .eq('room_id', room.id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (existing) {
      return res.json({ room_id: room.id, already_member: true });
    }

    // Check member limit
    const { count } = await (req.supabase || supabase).from('room_members')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', room.id);

    if (count >= MAX_MEMBERS_PER_ROOM) {
      return res.status(400).json({ error: `Phong da day (toi da ${MAX_MEMBERS_PER_ROOM} thanh vien)` });
    }

    // Add member
    const { data: member, error } = await (req.supabase || supabase).from('room_members')
      .insert({
        room_id: room.id,
        user_id: req.user.id,
        role: 'member'
      })
      .select('*, user:user_id(id, name, email, avatar_url)')
      .single();

    if (error) throw error;

    res.json({
      room_id: room.id,
      already_member: false,
      member: {
        _id: member.user?.id || member.user_id,
        name: member.user?.name || 'Unknown',
        avatar: member.user?.avatar_url || '',
        role: member.role
      }
    });
  } catch (error) {
    console.error('[Rooms /join]', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// GET /api/rooms/:id/members — List members
// ===========================================================================
router.get('/:id/members', protect, async (req, res) => {
  try {
    const { data: members } = await (req.supabase || supabase).from('room_members')
      .select('*, user:user_id(id, name, email, avatar_url)')
      .eq('room_id', req.params.id);

    res.json((members || []).map(m => ({
      _id: m.user?.id || m.user_id,
      user_id: m.user_id,
      name: m.user?.name || 'Unknown',
      email: m.user?.email || '',
      avatar: m.user?.avatar_url || '',
      role: m.role,
      peer_points: m.peer_points,
      joined_at: m.joined_at
    })));
  } catch (error) {
    console.error('[Rooms /members]', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// PUT /api/rooms/:id/members/:userId — Change member role (owner only)
// ===========================================================================
router.put('/:id/members/:userId', protect, async (req, res) => {
  try {
    const { role } = req.body;
    if (!role || !['admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Role khong hop le' });
    }

    // Check permission: only owner can change roles
    const { data: me } = await (req.supabase || supabase).from('room_members')
      .select('role')
      .eq('room_id', req.params.id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (!me || me.role !== 'owner') {
      return res.status(403).json({ error: 'Chi chu phong moi co the thay doi vai tro' });
    }

    const { data: member, error } = await (req.supabase || supabase).from('room_members')
      .update({ role })
      .eq('room_id', req.params.id)
      .eq('user_id', req.params.userId)
      .select('*')
      .single();

    if (error) throw error;
    res.json(toApi(member));
  } catch (error) {
    console.error('[Rooms /change-role]', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// DELETE /api/rooms/:id/members/:userId — Kick member (owner/admin)
// ===========================================================================
router.delete('/:id/members/:userId', protect, async (req, res) => {
  try {
    const { data: me } = await (req.supabase || supabase).from('room_members')
      .select('role')
      .eq('room_id', req.params.id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (!me || (me.role !== 'owner' && me.role !== 'admin')) {
      return res.status(403).json({ error: 'Ban khong co quyen kick thanh vien' });
    }

    // Cannot kick owner
    const { data: target } = await (req.supabase || supabase).from('room_members')
      .select('role')
      .eq('room_id', req.params.id)
      .eq('user_id', req.params.userId)
      .maybeSingle();

    if (!target) return res.status(404).json({ error: 'Khong tim thay thanh vien' });
    if (target.role === 'owner') {
      return res.status(400).json({ error: 'Khong the kick chu phong' });
    }

    const { error } = await (req.supabase || supabase).from('room_members')
      .delete()
      .eq('room_id', req.params.id)
      .eq('user_id', req.params.userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('[Rooms /kick]', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// POST /api/rooms/:id/library-files — Import file from Library into room
// ===========================================================================
router.post('/:id/library-files', protect, async (req, res) => {
  try {
    const { file_id, channel_id } = req.body;
    if (!file_id) return res.status(400).json({ error: 'Thieu file_id' });

    // Get original file from library
    const { data: originalFile, error: fileError } = await (req.supabase || supabase).from('files')
      .select('*')
      .eq('id', file_id)
      .maybeSingle();

    if (fileError || !originalFile) {
      return res.status(404).json({ error: 'Khong tim thay file trong Library' });
    }

    // Insert into room_files
    const { data: roomFile, error } = await (req.supabase || supabase).from('room_files')
      .insert({
        room_id: req.params.id,
        channel_id: channel_id || null,
        uploaded_by: req.user.id,
        original_name: originalFile.original_name,
        storage_url: originalFile.storage_url,
        file_type: originalFile.file_type,
        file_size: originalFile.file_size,
        extracted_text: originalFile.extracted_text,
        source_type: 'library',
        source_file_id: originalFile.id
      })
      .select('*')
      .single();

    if (error) throw error;
    res.status(201).json(toApi(roomFile));
  } catch (error) {
    console.error('[Rooms /library-files]', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
