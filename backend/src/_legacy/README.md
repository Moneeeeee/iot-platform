# ⚠️ Legacy Code - DO NOT USE

This directory contains **deprecated and obsolete code** that has been moved here to prevent accidental usage.

## Files in this directory:

### `app-legacy.ts`
- **Status**: ❌ DEPRECATED
- **Reason**: Duplicate server entry point that conflicts with `core/server.ts`
- **Issues**: 
  - Causes port 8000 conflicts
  - Duplicate protocol manager initialization
  - Resource handle leaks (EBADF)
- **Replacement**: Use `src/index.ts` → `core/server.ts` (IoTPlatformServer)

## ⚠️ Important

**DO NOT**:
- Import any files from this directory
- Use these files in production
- Copy code from these files without understanding the migration

**All files in this directory will throw errors immediately when imported or executed.**

## Migration Status

✅ **Completed**: 
- Entry point consolidated to `src/index.ts`
- Protocol adapters now have idempotent initialization
- Logger cleaned up (stdout only, no file transports)

## Questions?

If you need functionality from these files, check the new implementation in:
- `src/index.ts` - Main entry point
- `src/core/server.ts` - Server implementation
- `src/core/protocols/protocol-manager.ts` - Protocol management

