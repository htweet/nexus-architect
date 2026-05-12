<?php
/**
 * Nexus Architect — WordPress Page Builder
 *
 * @package     NexusArchitect
 * @author      Nexus Architect Core Team
 * @version     0.1.0
 *
 * Plugin Name:  Nexus Architect
 * Plugin URI:   https://nexusarchitect.io
 * Description:  A revolutionary visual page builder that rivals Elementor. Platform-agnostic React core, static HTML output, Lighthouse 95+ by default.
 * Version:      0.1.0
 * Author:       Nexus Architect Core Team
 * Author URI:   https://nexusarchitect.io
 * License:      GPL-2.0-or-later
 * License URI:  https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:  nexus-architect
 * Requires PHP: 8.0
 * Requires WP:  6.4
 */

declare(strict_types=1);

// Bail if accessed directly.
if (! defined('ABSPATH')) {
    exit;
}

// ─── Constants ────────────────────────────────────────────────────────────────

define('NEXUS_VERSION',     '0.1.0');
define('NEXUS_PLUGIN_FILE', __FILE__);
define('NEXUS_PLUGIN_DIR',  plugin_dir_path(__FILE__));
define('NEXUS_PLUGIN_URL',  plugin_dir_url(__FILE__));
define('NEXUS_DB_VERSION',  '1');

// ─── Autoloader ───────────────────────────────────────────────────────────────

spl_autoload_register(function (string $class): void {
    $prefix = 'NexusArchitect\\';
    if (! str_starts_with($class, $prefix)) {
        return;
    }
    $relative = str_replace('\\', DIRECTORY_SEPARATOR, substr($class, strlen($prefix)));
    $file     = NEXUS_PLUGIN_DIR . 'includes/' . $relative . '.php';
    if (file_exists($file)) {
        require_once $file;
    }
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────

/**
 * Returns the singleton Loader and wires all hooks.
 */
function nexus_architect(): NexusArchitect\Loader {
    static $instance = null;
    if (null === $instance) {
        $instance = new NexusArchitect\Loader();
        $instance->init();
    }
    return $instance;
}

add_action('plugins_loaded', 'nexus_architect');

// ─── Activation / Deactivation / Uninstall ────────────────────────────────────

register_activation_hook(__FILE__, [NexusArchitect\Database::class, 'install']);
register_deactivation_hook(__FILE__, [NexusArchitect\Database::class, 'on_deactivate']);
register_uninstall_hook(__FILE__, [NexusArchitect\Database::class, 'uninstall']);
