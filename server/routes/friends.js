const express = require('express');
const router = express.Router();
const { supabase, toApi } = require('../config/supabase');
const { protect } = require('../middleware/auth');

// ===========================================================================
// GET /api/friends — get friends list and pending requests
// ===========================================================================
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all friends (accepted and pending)
    const { data: friendsData, error: friendsErr } = await supabase
      .from('friends')
      .select('*')
      .or(`user1_id.eq.${req.user.id},user2_id.eq.${req.user.id}`);

    if (friendsErr) {
      if (friendsErr.message && friendsErr.message.includes('find the table')) {
        return res.json({ friends: [], pendingRequests: [] });
      }
      throw friendsErr;
    }

    const friendsList = [];
    const pendingRequests = [];

    // Map through the friendships to get user details
    for (const record of friendsData) {
      const isSender = record.user1_id === userId;
      const otherUserId = isSender ? record.user2_id : record.user1_id;

      // Fetch other user details
      let { data: otherUser, error: otherUserErr } = await supabase
        .from('users')
        .select('id, name, email, username, avatar_url')
        .eq('id', otherUserId)
        .single();

      if (otherUserErr && otherUserErr.message && otherUserErr.message.includes('username')) {
        const fallback = await supabase
          .from('users')
          .select('id, name, email, avatar_url')
          .eq('id', otherUserId)
          .single();
        otherUser = fallback.data;
        otherUserErr = fallback.error;
      }

      if (!otherUser) continue;

      const friendObj = {
        id: record.id,
        user: {
          id: otherUser.id,
          name: otherUser.name,
          email: otherUser.email,
          username: otherUser.username,
          avatar: otherUser.avatar_url || ''
        },
        status: record.status,
        is_sender: isSender,
        created_at: record.created_at
      };

      if (record.status === 'accepted') {
        friendsList.push(friendObj);
      } else if (record.status === 'pending' && !isSender) {
        pendingRequests.push(friendObj);
      }
    }

    res.json({ friends: friendsList, pending: pendingRequests });
  } catch (error) {
    console.error('[Friends GET /]', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// POST /api/friends/request — Send a friend request by username
// ===========================================================================
router.post('/request', protect, async (req, res) => {
  try {
    const { username } = req.body; // Actually we still receive it as `email` field from frontend for now, let's accept either `email` or `username` from frontend
    const identifier = req.body.username || req.body.email;

    if (!identifier) return res.status(400).json({ error: 'Vui lòng nhập Username (vd: name#1234) hoặc Email.' });

    const targetIdentifier = identifier.trim().toLowerCase();

    if (targetIdentifier === req.user.email?.toLowerCase() || targetIdentifier === req.user.username?.toLowerCase()) {
      return res.status(400).json({ error: 'Không thể tự kết bạn với chính mình.' });
    }

    // Find user by username or email
    let { data: targetUser, error: userErr } = await supabase
      .from('users')
      .select('id, name, email, username')
      .or(`username.eq.${targetIdentifier},email.eq.${targetIdentifier}`)
      .maybeSingle();

    if (userErr && userErr.message && userErr.message.includes('username')) {
      const fallback = await supabase
        .from('users')
        .select('id, name, email')
        .eq('email', targetIdentifier)
        .maybeSingle();
      targetUser = fallback.data;
      userErr = fallback.error;
    }

    if (userErr) throw userErr;
    if (!targetUser) return res.status(404).json({ error: 'Không tìm thấy người dùng này.' });

    // Check if friendship already exists
    const { data: existing, error: checkErr } = await supabase
      .from('friends')
      .select('*')
      .or(`and(user1_id.eq.${req.user.id},user2_id.eq.${targetUser.id}),and(user1_id.eq.${targetUser.id},user2_id.eq.${req.user.id})`)
      .maybeSingle();

    if (checkErr) throw checkErr;

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ error: 'Đã là bạn bè.' });
      }
      return res.status(400).json({ error: 'Đã gửi lời mời trước đó.' });
    }

    // Create friend request
    const { data: newFriend, error: insertErr } = await supabase
      .from('friends')
      .insert({
        user1_id: req.user.id,
        user2_id: targetUser.id,
        status: 'pending'
      })
      .select('*')
      .single();

    if (insertErr) throw insertErr;

    res.json(newFriend);
  } catch (error) {
    console.error('[Friends POST /request]', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// POST /api/friends/accept/:id — Accept a friend request
// ===========================================================================
router.post('/accept/:id', protect, async (req, res) => {
  try {
    const friendRecordId = req.params.id;

    const { data: record, error: findErr } = await supabase
      .from('friends')
      .select('*')
      .eq('id', friendRecordId)
      .single();

    if (findErr) throw findErr;
    if (!record || record.user2_id !== req.user.id) {
      return res.status(403).json({ error: 'Không có quyền truy cập.' });
    }

    const { data: updated, error: updateErr } = await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', friendRecordId)
      .select('*')
      .single();

    if (updateErr) throw updateErr;

    res.json(updated);
  } catch (error) {
    console.error('[Friends POST /accept]', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// GET /api/friends/messages/:friendId — Get chat history
// ===========================================================================
router.get('/messages/:friendId', protect, async (req, res) => {
  try {
    const friendId = req.params.friendId;
    const myId = req.user.id;

    // Optional: Verify they are friends
    const { data: isFriend, error: friendErr } = await supabase
      .from('friends')
      .select('id')
      .eq('status', 'accepted')
      .or(`and(user1_id.eq.${myId},user2_id.eq.${friendId}),and(user1_id.eq.${friendId},user2_id.eq.${myId})`)
      .maybeSingle();

    if (friendErr) throw friendErr;
    if (!isFriend) return res.status(403).json({ error: 'Bạn bè không hợp lệ.' });

    const { data: messages, error: msgErr } = await supabase
      .from('direct_messages')
      .select('*, sender:sender_id(id, name, avatar_url)')
      .or(`and(sender_id.eq.${myId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${myId})`)
      .order('created_at', { ascending: true })
      .limit(100);

    if (msgErr) throw msgErr;

    res.json(messages || []);
  } catch (error) {
    console.error('[Friends GET /messages]', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// POST /api/friends/messages/:friendId — Send message (fallback for non-socket)
// ===========================================================================
router.post('/messages/:friendId', protect, async (req, res) => {
  try {
    const receiverId = req.params.friendId;
    const senderId = req.user.id;
    const { content } = req.body;

    if (!content) return res.status(400).json({ error: 'Nội dung tin nhắn trống.' });

    const { data: msg, error: msgErr } = await supabase
      .from('direct_messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content: content.trim()
      })
      .select('*, sender:sender_id(id, name, avatar_url)')
      .single();

    if (msgErr) throw msgErr;

    res.json(msg);
  } catch (error) {
    console.error('[Friends POST /messages]', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
