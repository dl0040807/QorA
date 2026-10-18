-- So a personality-quiz answer (submitted by the contact at /invite/[token]) shows up on the contact management screen
-- without a refresh, subscribe via realtime to UPDATEs on contacts.
alter publication supabase_realtime add table contacts;
