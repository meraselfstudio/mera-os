-- 017_add_interns.sql
-- Menambahkan Naya dan Farisa sebagai tim magang baru (Intern)

INSERT INTO public.crew (nama, role, status_gaji, is_active) VALUES
  ('Naya', 'Intern', 'INTERN', TRUE),
  ('Farisa', 'Intern', 'INTERN', TRUE)
ON CONFLICT DO NOTHING;
