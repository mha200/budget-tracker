---
title: "Claude API native PDF support via document content type"
category: integration-issues
date: 2026-03-13
tags: [claude-api, anthropic-sdk, pdf, vision, receipt-scanning]
---

# Claude API Native PDF Support

## Problem

Receipt scanner only accepted image files (JPEG/PNG/WebP/GIF). Users uploading PDF receipts (Uber Eats, DoorDash, Amazon) got a file type error.

## Root Cause

The API route only used the `image` content type when sending files to Claude. PDFs require the `document` content type instead.

## Solution

Claude's API supports PDFs natively via the `document` content type — no need to convert PDFs to images:

```typescript
// For PDFs:
{
  type: "document",
  source: { type: "base64", media_type: "application/pdf", data: base64 }
}

// For images:
{
  type: "image",
  source: { type: "base64", media_type: mediaType, data: base64 }
}
```

Branch on file type at upload time:
```typescript
const isPdf = file.type === "application/pdf";
```

Also update the file input to accept PDFs:
```html
<input accept="image/*,.pdf,application/pdf" />
```

## Prevention

When building features that accept file uploads for AI processing, support both images and PDFs from the start — many digital receipts and documents are PDFs.
