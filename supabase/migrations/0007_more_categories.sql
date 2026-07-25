-- New spend categories for UMSU-specific expense types. Existing enum
-- values are untouched (renamed only at the display-label layer, see
-- lib/format.ts); Postgres enums can't have values removed, only added.
alter type request_category add value 'umsu_assets' after 'venue';
alter type request_category add value 'csm_promotional_material' after 'printing';
