-- Organization document branding assets.
-- The bucket is public so generated PDFs can fetch the logo server-side.
INSERT INTO storage.buckets (id, name, public)
VALUES ('organization-assets', 'organization-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Org admins can upload branding assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'organization-assets'
  AND EXISTS (
    SELECT 1
    FROM organization_members om
    JOIN users u ON u.id = om.user_id
    WHERE om.organization_id = split_part(name, '/', 1)::uuid
      AND u.auth_id = auth.uid()
      AND om.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Org admins can update branding assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'organization-assets'
  AND EXISTS (
    SELECT 1
    FROM organization_members om
    JOIN users u ON u.id = om.user_id
    WHERE om.organization_id = split_part(name, '/', 1)::uuid
      AND u.auth_id = auth.uid()
      AND om.role IN ('owner', 'admin')
  )
)
WITH CHECK (bucket_id = 'organization-assets');

CREATE POLICY "Org admins can delete branding assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'organization-assets'
  AND EXISTS (
    SELECT 1
    FROM organization_members om
    JOIN users u ON u.id = om.user_id
    WHERE om.organization_id = split_part(name, '/', 1)::uuid
      AND u.auth_id = auth.uid()
      AND om.role IN ('owner', 'admin')
  )
);
