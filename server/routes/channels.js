const express = require('express');
const router = express.Router();
const { supabase, toApi, toApiList } = require('../config/supabase');
const { protect } = require('../middleware/auth');
const { getMessages, getNickname } = require('../dataStore');

// Helper: check if user has owner/admin role in room
async function canManageChannels(req, roomId, userId) {
  const { data: member } = await (req.supabase || supabase).from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .maybeSingle();
  return member && (member.role === 'owner' || member.role === 'admin');
}

// ===========================================================================
// POST /api/rooms/:roomId/channels — Create channel
// ===========================================================================
router.post('/rooms/:roomId/channels', protect, async (req, res) => {
  try {
    const { name, description = '' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Vui long nhap ten channel' });
    }

    if (!await canManageChannels(req, req.params.roomId, req.user.id)) {
      return res.status(403).json({ error: 'Ban khong co quyen tao channel' });
    }

    const { data: channel, error } = await (req.supabase || supabase).from('room_channels')
      .insert({
        room_id: req.params.roomId,
        name: name.trim().toLowerCase().replace(/\s+/g, '-'),
        description,
        created_by: req.user.id
      })
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') { // unique violation
        return res.status(400).json({ error: 'Channel nay da ton tai' });
      }
      throw error;
    }

    res.status(201).json(toApi(channel));
  } catch (error) {
    console.error('[Channels /create]', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// PUT /api/rooms/:roomId/channels/:channelId — Update channel
// ===========================================================================
router.put('/rooms/:roomId/channels/:channelId', protect, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!await canManageChannels(req, req.params.roomId, req.user.id)) {
      return res.status(403).json({ error: 'Ban khong co quyen chinh sua channel' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name.trim().toLowerCase().replace(/\s+/g, '-');
    if (description !== undefined) updates.description = description;

    const { data: channel, error } = await (req.supabase || supabase).from('room_channels')
      .update(updates)
      .eq('id', req.params.channelId)
      .eq('room_id', req.params.roomId)
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Ten channel da ton tai' });
      }
      throw error;
    }
    if (!channel) return res.status(404).json({ error: 'Khong tim thay channel' });

    res.json(toApi(channel));
  } catch (error) {
    console.error('[Channels /update]', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// DELETE /api/rooms/:roomId/channels/:channelId — Delete channel
// ===========================================================================
router.delete('/rooms/:roomId/channels/:channelId', protect, async (req, res) => {
  try {
    if (!await canManageChannels(req, req.params.roomId, req.user.id)) {
      return res.status(403).json({ error: 'Ban khong co quyen xoa channel' });
    }

    // Cannot delete the default 'chat-chung' channel
    const { data: channel } = await (req.supabase || supabase).from('room_channels')
      .select('name')
      .eq('id', req.params.channelId)
      .eq('room_id', req.params.roomId)
      .maybeSingle();

    if (!channel) return res.status(404).json({ error: 'Khong tim thay channel' });
    if (channel.name === 'chat-chung') {
      return res.status(400).json({ error: 'Khong the xoa channel mac dinh' });
    }

    const { error } = await (req.supabase || supabase).from('room_channels')
      .delete()
      .eq('id', req.params.channelId)
      .eq('room_id', req.params.roomId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('[Channels /delete]', error);
    res.status(500).json({ error: error.message });
  }
});
// ===========================================================================
// GET /api/rooms/:roomId/channels/:channelId/messages — get history
// ===========================================================================
router.get('/rooms/:roomId/channels/:channelId/messages', protect, async (req, res) => {
  try {
    // KHÔNG join room_members(nickname) vì cột nickname không tồn tại → query fail.
    // Nickname lấy từ local dataStore (getNickname) bên dưới.
    const { data: messages, error } = await supabase
      .from('room_messages')
      .select('*, users:user_id(id, name, email, avatar_url)')
      .eq('channel_id', req.params.channelId)
      .eq('room_id', req.params.roomId)
      .order('created_at', { ascending: true })
      .limit(100);

    let dbMessages = [];
    if (error) {
      if (error.message && (error.message.includes('relation "public.room_messages" does not exist') || error.message.includes('Could not find the table \'public.room_messages\''))) {
        // Table not created yet, just use empty array and let local dataStore fallback take over
      } else {
        throw error;
      }
    } else {
      dbMessages = messages || [];
    }

    // Map to frontend expected format for DB messages
    let formattedMessages = dbMessages.map(msg => {
      const userObj = msg.users || {};
      const memberInfo = Array.isArray(userObj.room_members) ? userObj.room_members[0] : userObj.room_members;
      let nickname = memberInfo ? memberInfo.nickname : undefined;
      
      // Fallback to local store for nickname if not in DB
      if (!nickname) nickname = getNickname(msg.room_id, userObj.id) || undefined;

      return {
        id: msg.id,
        roomId: msg.room_id,
        channelId: msg.channel_id,
        user: {
          id: userObj.id,
          name: userObj.name,
          email: userObj.email,
          avatar: userObj.avatar_url || '',
          nickname: nickname
        },
        content: msg.content,
        type: msg.type,
        createdAt: msg.created_at
      };
    });
    
    // Fallback: merge with local messages from dataStore.js
    const localMsgs = getMessages().filter(m => m.roomId === req.params.roomId && m.channelId === req.params.channelId);
    if (localMsgs.length > 0) {
      formattedMessages = [...formattedMessages, ...localMsgs];
      // deduplicate by id
      const seen = new Set();
      formattedMessages = formattedMessages.filter(m => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
      formattedMessages.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    res.json(formattedMessages);
  } catch (error) {
    console.error('[Channels /messages]', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
