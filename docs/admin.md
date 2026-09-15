# Admin Access

## Default Admin Account

| Field    | Value                  |
|----------|------------------------|
| Email    | `admin@jobagent.com`   |
| Password | `AdminJob@2025!`       |
| User ID  | `01M2J58RPQ6RT87N1YXF` |

Log in at `/login` with the credentials above. The **Admin** nav link appears automatically for admin users.

## Admin Panel (`/admin`)

- Search users by email
- View subscription status (Premium / Free / Expired)
- Grant subscriptions with configurable duration (7d / 30d / 90d / 1yr / Lifetime)
- Revoke active subscriptions

## How Admin Access Works

Admin status is stored as a KV key `admin:{userId}` with value `"1"`. Every admin API request checks this key server-side. The `isAdmin` flag is also persisted in `localStorage` on the frontend to control nav visibility.

## Adding a New Admin

1. Register or find the user's ID from the admin panel (shown under their email)
2. Set the KV key:

```bash
npx wrangler kv key put "admin:{USER_ID}" "1" --namespace-id 1e06366b25ae4199bad36705e2a11953
```

3. The user must log out and back in for the Admin nav link to appear.

## Revoking Admin Access

```bash
npx wrangler kv key delete "admin:{USER_ID}" --namespace-id 1e06366b25ae4199bad36705e2a11953
```

## Granting Subscriptions via API

```bash
curl -X POST https://<api-url>/admin/subscriptions \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"userId": "<target-user-id>", "durationDays": 30}'
```

## Subscription API Routes

| Method | Path                              | Description                        |
|--------|-----------------------------------|------------------------------------|
| GET    | `/admin/users?search=`            | List all users with sub status     |
| GET    | `/admin/subscriptions/:userId`    | Get a specific user's subscription |
| POST   | `/admin/subscriptions`            | Grant / renew subscription         |
| DELETE | `/admin/subscriptions/:userId`    | Revoke subscription                |
| GET    | `/subscriptions/me`               | Current user checks their own sub  |
| DELETE | `/subscriptions/me`               | Current user cancels their own sub |
