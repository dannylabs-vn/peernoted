-- =========================================================================================
-- KÍCH HOẠT ROW LEVEL SECURITY (RLS)
-- =========================================================================================

-- 1. Bật RLS cho các bảng
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_files ENABLE ROW LEVEL SECURITY;

-- 2. Policies cho folders (Chủ sở hữu mới được thao tác)
CREATE POLICY "Users can view their own folders" ON folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own folders" ON folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own folders" ON folders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own folders" ON folders FOR DELETE USING (auth.uid() = user_id);

-- 3. Policies cho files (Chủ sở hữu folder chứa file mới được thao tác)
CREATE POLICY "Users can view their files" ON files FOR SELECT USING (
  EXISTS (SELECT 1 FROM folders WHERE folders.id = files.folder_id AND folders.user_id = auth.uid())
);
CREATE POLICY "Users can insert files to their folders" ON files FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM folders WHERE folders.id = files.folder_id AND folders.user_id = auth.uid())
);
CREATE POLICY "Users can update their files" ON files FOR UPDATE USING (
  EXISTS (SELECT 1 FROM folders WHERE folders.id = files.folder_id AND folders.user_id = auth.uid())
);
CREATE POLICY "Users can delete their files" ON files FOR DELETE USING (
  EXISTS (SELECT 1 FROM folders WHERE folders.id = files.folder_id AND folders.user_id = auth.uid())
);

-- 4. Policies cho rooms
CREATE POLICY "Room members can view room" ON rooms FOR SELECT USING (
  EXISTS (SELECT 1 FROM room_members WHERE room_members.room_id = rooms.id AND room_members.user_id = auth.uid())
);
-- Admin/Owner can update room
CREATE POLICY "Room admins can update room" ON rooms FOR UPDATE USING (
  EXISTS (SELECT 1 FROM room_members WHERE room_members.room_id = rooms.id AND room_members.user_id = auth.uid() AND role IN ('owner', 'admin'))
);
-- Bất kỳ ai cũng có thể insert room (và backend sẽ tự gán họ làm owner ở room_members)
CREATE POLICY "Anyone can create room" ON rooms FOR INSERT WITH CHECK (true);

-- 5. Policies cho room_members
CREATE POLICY "Members can view room members" ON room_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM room_members rm WHERE rm.room_id = room_members.room_id AND rm.user_id = auth.uid())
);
-- Mọi người có thể tự join (nếu có logic join qua backend)
CREATE POLICY "Anyone can join room" ON room_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update members" ON room_members FOR UPDATE USING (
  EXISTS (SELECT 1 FROM room_members rm WHERE rm.room_id = room_members.room_id AND rm.user_id = auth.uid() AND rm.role IN ('owner', 'admin'))
);
CREATE POLICY "Members can leave or admins can kick" ON room_members FOR DELETE USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM room_members rm WHERE rm.room_id = room_members.room_id AND rm.user_id = auth.uid() AND rm.role IN ('owner', 'admin'))
);

-- 6. Policies cho room_channels
CREATE POLICY "Members can view channels" ON room_channels FOR SELECT USING (
  EXISTS (SELECT 1 FROM room_members WHERE room_members.room_id = room_channels.room_id AND room_members.user_id = auth.uid())
);
CREATE POLICY "Admins can manage channels" ON room_channels FOR ALL USING (
  EXISTS (SELECT 1 FROM room_members WHERE room_members.room_id = room_channels.room_id AND room_members.user_id = auth.uid() AND role IN ('owner', 'admin'))
);

-- 7. Policies cho room_files
CREATE POLICY "Members can view room files" ON room_files FOR SELECT USING (
  EXISTS (SELECT 1 FROM room_members WHERE room_members.room_id = room_files.room_id AND room_members.user_id = auth.uid())
);
CREATE POLICY "Members can upload room files" ON room_files FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM room_members WHERE room_members.room_id = room_files.room_id AND room_members.user_id = auth.uid())
);
CREATE POLICY "Uploader or admin can delete room files" ON room_files FOR DELETE USING (
  uploaded_by = auth.uid() OR
  EXISTS (SELECT 1 FROM room_members WHERE room_members.room_id = room_files.room_id AND room_members.user_id = auth.uid() AND role IN ('owner', 'admin'))
);
