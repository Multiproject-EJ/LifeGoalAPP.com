-- Seed a specific email/password account for manual testing.
-- Run this in the Supabase SQL editor with service-role permissions.
select
  auth.create_user(
    email        => 'Josefsen.eivind@gmail.com',
    password     => 'Admin123',
    email_confirm => true
  );
