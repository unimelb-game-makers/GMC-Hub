-- New "technical" spend category, for club tech/dev costs (hosting,
-- domains, software licences, etc.) that don't fit the existing categories.
alter type request_category add value 'technical' after 'equipment';
