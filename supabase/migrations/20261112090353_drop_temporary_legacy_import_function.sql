-- The one-off load of legacy.recruitment_agencies is complete and verified
-- (25,640 rows, matching the export). Remove the temporary import route.
drop function public.import_legacy_agencies(text, jsonb);
drop table legacy.import_tokens;
