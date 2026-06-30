const express = require('express');
const router = express.Router();
const { supabase, toApi, toApiList } = require('../config/supabase');
const { protect } = require('../middleware/auth');

// ===========================================================================
// GET /api/peerpoints/:userId — Get user's points + unlocked rewards
// ===========================================================================
router.get('/peerpoints/:userId', protect, async (req, res) => {
  try {
    // Sum peer_points from all room memberships
    const { data: memberships } = await (req.supabase || supabase).from('room_members')
      .select('room_id, peer_points, role')
      .eq('user_id', req.params.userId);

    const totalPoints = (memberships || []).reduce((sum, m) => sum + (m.peer_points || 0), 0);

    // Get unlocked rewards
    const { data: unlocked } = await (req.supabase || supabase).from('user_unlocked_rewards')
      .select('*, reward:reward_id(*)')
      .eq('user_id', req.params.userId);

    res.json({
      user_id: req.params.userId,
      total_points: totalPoints,
      memberships: memberships || [],
      unlocked_rewards: (unlocked || []).map(u => ({
        ...toApi(u.reward),
        unlocked_at: u.unlocked_at
      }))
    });
  } catch (error) {
    console.error('[PeerPoints /get]', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// POST /api/peerpoints/award — Award points to a user in a room
// ===========================================================================
router.post('/peerpoints/award', protect, async (req, res) => {
  try {
    const { room_id, user_id, points, reason = '' } = req.body;
    if (!room_id || !user_id || !points) {
      return res.status(400).json({ error: 'Thieu thong tin' });
    }

    // Only owner/admin can award points
    const { data: me } = await (req.supabase || supabase).from('room_members')
      .select('role')
      .eq('room_id', room_id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (!me || (me.role !== 'owner' && me.role !== 'admin')) {
      return res.status(403).json({ error: 'Ban khong co quyen tang diem' });
    }

    const { data: member, error } = await (req.supabase || supabase).from('room_members')
      .update({ peer_points: supabase.raw(`peer_points + ${points}`) })
      .eq('room_id', room_id)
      .eq('user_id', user_id)
      .select('*')
      .single();

    if (error) throw error;

    // Get updated total
    const { data: memberships } = await (req.supabase || supabase).from('room_members')
      .select('peer_points')
      .eq('user_id', user_id);
    const total = (memberships || []).reduce((sum, m) => sum + (m.peer_points || 0), 0);

    res.json({
      awarded: points,
      reason,
      new_balance: total,
      member: toApi(member)
    });
  } catch (error) {
    console.error('[PeerPoints /award]', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// GET /api/rewards — List reward catalog
// ===========================================================================
router.get('/rewards', protect, async (req, res) => {
  try {
    const { data: rewards } = await (req.supabase || supabase).from('peer_rewards')
      .select('*')
      .eq('is_active', true)
      .order('cost', { ascending: true });

    res.json(toApiList(rewards));
  } catch (error) {
    console.error('[PeerPoints /rewards]', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// POST /api/rewards/unlock — Unlock a reward for current user
// ===========================================================================
router.post('/rewards/unlock', protect, async (req, res) => {
  try {
    const { reward_id } = req.body;
    if (!reward_id) return res.status(400).json({ error: 'Thieu reward_id' });

    // Get reward info
    const { data: reward } = await (req.supabase || supabase).from('peer_rewards')
      .select('*')
      .eq('id', reward_id)
      .maybeSingle();

    if (!reward) return res.status(404).json({ error: 'Khong tim thay reward' });

    // Check if already unlocked
    const { data: existing } = await (req.supabase || supabase).from('user_unlocked_rewards')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('reward_id', reward_id)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: 'Ban da mo khoa reward nay roi' });
    }

    // Calculate total points
    const { data: memberships } = await (req.supabase || supabase).from('room_members')
      .select('peer_points')
      .eq('user_id', req.user.id);
    const totalPoints = (memberships || []).reduce((sum, m) => sum + (m.peer_points || 0), 0);

    if (totalPoints < reward.cost) {
      return res.status(400).json({
        error: `Khong du PeerPoints. Ban can ${reward.cost} nhung chi co ${totalPoints}`
      });
    }

    // Deduct from all memberships proportionally
    const pointsToDeduct = Math.min(totalPoints, reward.cost);
    let remaining = pointsToDeduct;

    for (const m of (memberships || [])) {
      if (remaining <= 0) break;
      const deductFromThis = Math.min(m.peer_points || 0, remaining);
      if (deductFromThis > 0) {
        await (req.supabase || supabase).from('room_members')
          .update({ peer_points: supabase.raw(`peer_points - ${deductFromThis}`) })
          .eq('id', m.id);
        remaining -= deductFromThis;
      }
    }

    // Record unlock
    const { data: unlocked, error } = await (req.supabase || supabase).from('user_unlocked_rewards')
      .insert({ user_id: req.user.id, reward_id })
      .select('*')
      .single();

    if (error) throw error;

    res.status(201).json({
      ...toApi(reward),
      unlocked_at: unlocked.unlocked_at
    });
  } catch (error) {
    console.error('[PeerPoints /unlock]', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
