<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@mike-north/devcert-patched](./devcert-patched.md) &gt; [uninstall](./devcert-patched.uninstall.md)

## uninstall() function

Remove as much of the devcert files and state as we can. This is necessary when generating a new root certificate, and should be available to API consumers as well.

Not all of it will be removable. If certutil is not installed, we'll leave Firefox alone. We try to remove files with maximum permissions, and if that fails, we'll silently fail.

It's also possible that the command to untrust will not work, and we'll silently fail that as well; with no existing certificates anymore, the security exposure there is minimal.

<b>Signature:</b>

```typescript
export declare function uninstall(): void;
```
<b>Returns:</b>

`void`
