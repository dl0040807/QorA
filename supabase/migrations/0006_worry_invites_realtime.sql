-- So a contact's reply shows up on the F2-1 home screen without a refresh,
-- subscribe via realtime to UPDATEs on worry_invites (reply arrived = used_at set).
alter publication supabase_realtime add table worry_invites;
