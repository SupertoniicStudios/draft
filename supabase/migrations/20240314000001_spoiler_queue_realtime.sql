-- Fix missing realtime configuration for spoiler queue features
ALTER PUBLICATION supabase_realtime ADD TABLE teams;
ALTER TABLE user_queues REPLICA IDENTITY FULL;
