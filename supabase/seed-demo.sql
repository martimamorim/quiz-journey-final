-- Arquivo de semente demo para o projeto Quiz Journey Final
-- Substitua <TEACHER_UUID> pelo ID do professor existente em auth.users
-- Execute este script no editor SQL do Supabase ou usando a CLI

-- Exemplo de código de turma demo: DEMO01

-- 1) Se necessário, adicione a role de teacher ao utilizador do professor:
-- INSERT INTO public.user_roles (id, user_id, role)
-- VALUES (gen_random_uuid(), '<TEACHER_UUID>', 'teacher');

INSERT INTO public.classes (id, teacher_id, name, join_code)
VALUES (
  gen_random_uuid(),
  '<TEACHER_UUID>',
  'Turma Demo',
  'DEMO01'
)
ON CONFLICT (join_code) DO NOTHING;

WITH demo_class AS (
  SELECT id FROM public.classes WHERE join_code = 'DEMO01'
)
INSERT INTO public.locations (class_id, name, hint, qr_code, lat, lng, order_index)
SELECT c.id, x.name, x.hint, x.qr_code, x.lat, x.lng, x.order_index
FROM demo_class c
CROSS JOIN LATERAL (VALUES
  ('Biblioteca', 'Começa pela biblioteca e procura o livro escondido.', 'LIB01', -23.55052, -46.63331, 0),
  ('Laboratório', 'Segue para o laboratório com o mapa.', 'LAB01', -23.55100, -46.63400, 1),
  ('Ginásio', 'O último ponto é o ginásio da escola.', 'GYM01', -23.55000, -46.63250, 2)
) AS x(name, hint, qr_code, lat, lng, order_index)
ON CONFLICT (class_id, qr_code) DO NOTHING;

INSERT INTO public.questions (location_id, text, options, correct_index, points, order_index)
SELECT l.id, q.text, q.options, q.correct_index, q.points, q.order_index
FROM public.locations l
JOIN LATERAL (VALUES
  ('LIB01', 'Qual é a capital do Brasil?', '["Brasília", "São Paulo", "Rio de Janeiro"]'::jsonb, 0, 10, 0),
  ('LAB01', 'Quantos sentidos tem o corpo humano?', '["3", "5", "7"]'::jsonb, 1, 10, 0),
  ('GYM01', 'Qual destes é um desporto olímpico?', '["Futebol americano", "Críquete", "Atletismo"]'::jsonb, 2, 10, 0)
) AS q(qr_code, text, options, correct_index, points, order_index)
ON CONFLICT DO NOTHING
WHERE l.qr_code = q.qr_code
  AND l.class_id = (SELECT id FROM public.classes WHERE join_code = 'DEMO01');
