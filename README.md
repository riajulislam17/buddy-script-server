# Backend Documentation

## Overview

This backend is built with NestJS, Sequelize, and PostgreSQL. It provides the API for:

- authentication
- protected feed access
- post creation and visibility rules
- image upload
- reactions
- nested comments and replies
- profile update

The backend is structured around clear module boundaries and centralized helpers for:

- auth extraction
- validation
- success/error response shaping
- post/comment access rules
- cursor pagination
- reaction summary aggregation

---

## Stack

- NestJS
- PostgreSQL
- Sequelize
- sequelize-typescript
- Passport JWT
- Cookie/JWT auth flow
- class-validator
- class-transformer
- Axios/FormData for image upload integration

---

## Run Commands

Install dependencies:

```bash
cd server
npm install
```

Development:

```bash
npm run start:dev
```

Build:

```bash
npm run build
```

Run migrations:

```bash
npm run migration
```

Rollback last migration:

```bash
npm run migration:rollback
```

Run tests:

```bash
npm test -- --runInBand
```

---

## Folder Structure

```bash
server/
  migrations/
  src/
    app.module.ts
    main.ts
    common/
      constants/
      decorators/
      filters/
      guards/
      helpers/
      utils/
    config/
    model/
    modules/
      auth/
      comments/
      posts/
      reactions/
      uploads/
```

---

## Data Model

## Tables

- `users`
- `posts`
- `comments`
- `reactions`

## Relationships

- a user can create many posts
- a user can create many comments
- a post belongs to a user
- a comment belongs to a post and a user
- a comment can belong to another comment through `parentId`
- nested replies are stored in the same `comments` table
- reactions belong to a user and point to content by `targetType + targetId`

This keeps the model simpler than maintaining separate `reply` and `comment-like` tables.

---

## Database Indexing and Scalability

Important indexes:

- `users.email` unique
- `posts.visibility`
- `posts.userId`
- `posts.createdAt, id`
- `comments.postId`
- `comments.parentId`
- `comments.postId, parentId, createdAt, id`
- `reactions.userId, targetType, targetId` unique
- `reactions.targetType, targetId`

Why:

- feed uses newest-first access patterns
- comment threads use root comment pagination and lazy reply fetches
- reaction lookups need fast target-level grouping

---

## Core Modules

## 1. Auth Module

Responsibilities:

- register user
- login user
- issue token
- validate authenticated requests
- fetch current user
- update profile

## 2. Posts Module

Responsibilities:

- create posts
- update/delete own posts
- feed queries
- public/private visibility enforcement
- reaction and comment counts on feed items

Design notes:

- feed uses cursor pagination
- newest-first ordering is enforced at query level
- reaction summary aggregation is shared through helper logic

## 3. Comments Module

Responsibilities:

- create top-level comments
- create nested replies
- edit/delete own comments
- fetch paginated root comments
- fetch replies lazily
- provide reply counts

Design notes:

- root comments are paginated
- replies are fetched on demand
- full nested comment trees are intentionally not loaded in one query
- comment writing includes basic rate-limiting guard and length validation

## 4. Reactions Module

Responsibilities:

- toggle post reaction
- toggle comment reaction
- fetch reaction users
- enforce target access rules before reacting

## 5. Uploads Module

Responsibilities:

- accept image file upload
- validate file type
- forward to image hosting
- return final image URL

---

## Shared Backend Foundations

## Validation

Purpose:

- whitelist request bodies
- reject unexpected fields
- auto-transform DTO values

## Success and Error Response Shape

Purpose:

- predictable success responses
- normalized error payloads
- safer client integration

## Access Rules

Purpose:

- centralize private/public post access checks
- centralize comment access checks
- reduce repeated authorization logic in modules

## Reaction Aggregation

Purpose:

- build consistent reaction count maps
- build current reaction state maps
- build limited preview user lists

## Pagination

Purpose:

- normalize limits
- decode/encode cursors
- generate next cursor payloads

---

## API Summary

## Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `PATCH /auth/profile`

## Posts

- `POST /posts`
- `PATCH /posts/:postId`
- `DELETE /posts/:postId`
- `GET /posts/feed`
- `GET /posts/public`
- `GET /posts/me`

## Comments

- `POST /comments`
- `GET /comments/post/:postId`
- `GET /comments/:commentId/replies`
- `PATCH /comments/:commentId`
- `DELETE /comments/:commentId`

## Reactions

- `POST /reactions/toggle`
- `GET /reactions/users`

## Uploads

- `POST /uploads/image`

---

## Security and Performance Considerations

- protected endpoints use JWT auth guard
- comment/post access is validated server-side
- private posts are not accessible to other users
- reactions validate target accessibility before mutation
- comment content has min/max validation
- basic anti-spam write guard is applied to comment creation
- feed uses cursor pagination
- comment threads use root pagination plus lazy replies
- DB indexes were chosen around read-heavy access patterns

---

## Verification

Verified locally:

- `npm run build`
- `npm test -- --runInBand`
- `npm run migration`
