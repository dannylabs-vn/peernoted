const express = require('express');
const router = express.Router();
const { supabase, toApi, toApiList } = require('../config/supabase');
const { protect } = require('../middleware/auth');

// Helper: check if user has owner/admin role in room
async function canManageChannels(roomId, userId) {
  const { data: member } = await supabase
    .from('room_members')
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

    if (!await canManageChannels(req.params.roomId, req.user.id)) {
      return res.status(403).json({ error: 'Ban khong co quyen tao channel' });
    }

    const { data: channel, error } = await supabase
      .from('room_channels')
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

    if (!await canManageChannels(req.params.roomId, req.user.id)) {
      return res.status(403).json({ error: 'Ban khong co quyen chinh sua channel' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name.trim().toLowerCase().replace(/\s+/g, '-');
    if (description !== undefined) updates.description = description;

    const { data: channel, error } = await supabase
      .from('room_channels')
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
    if (!await canManageChannels(req.params.roomId, req.user.id)) {
      return res.status(403).json({ error: 'Ban khong co quyen xoa channel' });
    }

    // Cannot delete the default 'chat-chung' channel
    const { data: channel } = await supabase
      .from('room_channels')
      .select('name')
      .eq('id', req.params.channelId)
      .eq('room_id', req.params.roomId)
      .maybeSingle();

    if (!channel) return res.status(404).json({ error: 'Khong tim thay channel' });
    if (channel.name === 'chat-chung') {
      return res.status(400).json({ error: 'Khong the xoa channel mac dinh' });
    }

    const { error } = await supabase
      .from('room_channels')
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

module.exports = router;
