# @rotshop/shared

Single source of truth for types and constants shared between the Rotshop frontend and backend.

Both sides import from `@rotshop/shared` and the contract lives in `types.ts`. Never duplicate or redefine these types in either workspace — change them here.

## How consumers link

Until/unless we adopt a workspace tool, each consumer references this package with `file:../shared` in its `package.json`:

```json
{
  "dependencies": {
    "@rotshop/shared": "file:../shared"
  }
}
```

After `npm install`, the symlink resolves bare imports:

```typescript
import type { Module, SubmitRequest, DiscoverResponse } from '@rotshop/shared';
import { CATEGORIES, slugify } from '@rotshop/shared';
```
