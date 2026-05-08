<?php

declare(strict_types=1);

/**
 * Autoloader — Tier C, additive.
 *
 * This class adds a class autoloader that finds any class file in
 * php-backend/src/ on demand. It does NOT remove the existing
 * require_once chain in public/index.php — that's intentional. Both
 * mechanisms coexist:
 *
 *   - require_once: still loads the 50+ critical classes eagerly, just
 *     like before. Behavior is unchanged for every currently-shipping
 *     code path.
 *   - autoloader: fires ONLY when PHP encounters a class name that
 *     wasn't pre-required. Today that means any new class added later,
 *     or any optional/lazy-loaded helper.
 *
 * Why additive: the production router has been working. Switching to
 * pure autoload would mean discovering every implicit load order
 * dependency at runtime — which on a money-handling app is a no-go.
 * The autoloader earns its keep gradually: each release where a class
 * is added, you can drop the corresponding require_once line and
 * verify the app still works.
 *
 * SAFETY:
 *   - Calling Autoloader::register() is idempotent. Calling it twice
 *     does NOT register the callback twice (we guard with a static).
 *   - The callback returns silently for any class it can't resolve,
 *     so other autoloaders (composer, etc.) still get a chance.
 *   - Disabling: simply do not call Autoloader::register(). Or unregister
 *     with spl_autoload_unregister([Autoloader::class, 'load']).
 *
 * MIGRATION PATH (future, incremental):
 *   Once OPcache preload (php-tier-a-tuning.ini) is enabled in production
 *   AND has run cleanly for 2 weeks, you can safely delete most lines
 *   from the require_once chain in public/index.php. Preload covers the
 *   eager case and Autoloader covers the rest. Track progress in
 *   tier-c-roadmap.md.
 */
final class Autoloader
{
    private static bool $registered = false;
    private static ?string $srcDir = null;

    public static function register(?string $srcDir = null): void
    {
        if (self::$registered) {
            return;
        }
        self::$srcDir = $srcDir ?? realpath(__DIR__);
        if (self::$srcDir === false) {
            return;
        }
        spl_autoload_register([self::class, 'load'], throw: true, prepend: false);
        self::$registered = true;
    }

    /**
     * Resolve and require a single class file.
     *
     * Lookup rules (cheapest first):
     *   1. <srcDir>/<ClassName>.php
     *
     * No namespaces are supported because this codebase doesn't use
     * them — every class lives at the root of `src/`. If we adopt
     * namespacing later, extend this to translate `App\Foo\Bar` to
     * `<srcDir>/Foo/Bar.php`.
     */
    public static function load(string $class): void
    {
        if (self::$srcDir === null) {
            return;
        }
        // Reject anything that contains a path separator or attempts a
        // traversal — defense in depth, even though autoloader inputs
        // come from the PHP engine itself, never user input.
        if ($class === '' || strpbrk($class, "/\\.\0") !== false) {
            return;
        }
        $candidate = self::$srcDir . DIRECTORY_SEPARATOR . $class . '.php';
        if (is_file($candidate)) {
            require_once $candidate;
        }
    }

    /** Diagnostic for admin/health endpoints. */
    public static function isRegistered(): bool
    {
        return self::$registered;
    }
}
