// Wipes all app data (tables, receipt files, auth users) from the Supabase
// project in .env — schema and policies are untouched. Run: npm run wipe -- --yes
// Everything recreates itself on next sign-in. Careful once real data exists.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env vars — run via: npm run wipe -- --yes");
  process.exit(1);
}
if (!process.argv.includes("--yes")) {
  console.error(`This wipes ALL data in ${url}. Re-run with: npm run wipe -- --yes`);
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}` };
const api = (path, init = {}) =>
  fetch(`${url}${path}`, { ...init, headers: { ...headers, ...init.headers } });

for (const table of ["status_history", "request_bank_details", "requests", "events", "bank_details", "app_users"]) {
  const pk = table.endsWith("bank_details")
    ? table === "bank_details" ? "app_user_id" : "request_id"
    : "id";
  const res = await api(`/rest/v1/${table}?${pk}=not.is.null`, { method: "DELETE" });
  console.log(`${table}: ${res.ok ? "cleared" : `FAILED (${res.status})`}`);
}

// Storage list is per-folder; receipts live under {user_id}/{request_id}/file.
const listRes = await api(`/storage/v1/object/list/receipts`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prefix: "", limit: 1000 }),
});
const folders = (await listRes.json()).map((o) => o.name);
let removed = 0;
for (const folder of folders) {
  const sub = await api(`/storage/v1/object/list/receipts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: folder, limit: 1000 }),
  });
  for (const entry of await sub.json()) {
    const inner = await api(`/storage/v1/object/list/receipts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: `${folder}/${entry.name}`, limit: 1000 }),
    });
    const files = (await inner.json()).map((f) => `${folder}/${entry.name}/${f.name}`);
    if (files.length) {
      await api(`/storage/v1/object/receipts`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: files }),
      });
      removed += files.length;
    }
  }
}
console.log(`receipts: ${removed} file(s) removed`);

let deleted = 0;
for (;;) {
  const res = await api(`/auth/v1/admin/users?per_page=100`);
  const { users = [] } = await res.json();
  if (users.length === 0) break;
  for (const user of users) {
    await api(`/auth/v1/admin/users/${user.id}`, { method: "DELETE" });
    deleted++;
  }
}
console.log(`auth users: ${deleted} deleted`);
console.log("Done — sign in again to recreate your user.");
