<?php
/*
 * Plugin Name: Local To IP
 * Description: Dynamically replaces localhost URLs with the local IP address.
 * Version: 1.0.0
 * Author: Abbas Kargar
 * Author URI: https://abbaskargar.ir
 * License:           GPL-2.0
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
*/

if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

class local_to_ip {
	public function __construct() {
		add_action('admin_menu', array($this, 'add_admin_menu'));
		add_action('admin_enqueue_scripts', array($this, 'nqueue_admin_styles'));
		add_action( 'plugins_loaded', array($this, 'local_to_ip_load_textdomain'));

		$this->run();
	}

	public function getNetworkIPAddresses() {
		$os = strtoupper(substr(PHP_OS, 0, 3));
		$ipAddresses = [];
		$output = '';
		if ($os === 'WIN') {
			//$output = shell_exec('ipconfig');
			preg_match_all('/IPv4 Address[ .]*: ([\d\.]+)/', $output, $matches);
		} else {
			//$output = shell_exec('ifconfig');
			preg_match_all('/inet (\d{1,3}(\.\d{1,3}){3})/', $output, $matches);
		}

		if (!empty($matches[1])) {
			$ipAddresses = $matches[1];
		}

		$excludedIPs = ['127.0.0.1', '::1'];
		$ipAddresses = array_filter($ipAddresses, function($ip) use ($excludedIPs) {
			return !in_array($ip, $excludedIPs);
		});

		if (count($ipAddresses) === 0){
			return [__('This feature uses a sensitive function (shell_exec) which will usually block your server. If you and the server manager are aware of this issue or are using internal web servers (such as wamp or xampp) by uncommenting lines 28 and 31 of the file "wp-content/plugins/local-to-ip/local-to-ip.php", you can Enable the feature.', 'local-to-ip')];
		}
		return $ipAddresses;
	}

	public function run() {
		$data = get_option('local2ip');
		if (isset($data['activation']) && $data['activation'] === 'true' && isset($data['localip'])){
			add_action('wp_head', array($this, 'replace_urls_in_head'), 1);

			add_filter('option_siteurl', array($this, 'replace_localhost_with_ip'), 1);
			add_filter('option_home', array($this, 'replace_localhost_with_ip'), 1);
			/*
			add_filter('the_content', array($this, 'replace_localhost_with_ip'), 1);
			add_filter('script_loader_src', array($this, 'replace_localhost_with_ip'), 1);
			add_filter('style_loader_src', array($this, 'replace_localhost_with_ip'), 1);
			add_filter('template_directory_uri', array($this, 'replace_localhost_with_ip'), 1);
			add_filter('stylesheet_directory_uri', array($this, 'replace_localhost_with_ip'), 1);
			add_filter('site_url', array($this, 'replace_localhost_with_ip'), 1);
			add_filter('post_link', array($this, 'replace_localhost_with_ip'), 1);
			add_filter('post_type_link', array($this, 'replace_localhost_with_ip'), 1);
			add_filter('page_link', array($this, 'replace_localhost_with_ip'), 1);
			add_filter('term_link', array($this, 'replace_localhost_with_ip'), 1);
			add_filter('tag_link', array($this, 'replace_localhost_with_ip'), 1);
			add_filter('category_link', array($this, 'replace_localhost_with_ip'), 1);
			add_filter('wp_get_attachment_url', array($this, 'replace_localhost_with_ip'), 1);
			add_filter('widget_text', array($this, 'replace_localhost_with_ip'), 1);
			add_filter('widget_content', array($this, 'replace_localhost_with_ip'), 1);
			*/

			add_action( 'rest_api_init', function () {
				register_rest_route( 'local2ip/v1', '/deactive', array(
					'methods' => 'GET',
					'callback' => array($this, 'delete_local2ip_callback'),
					'permission_callback' => '__return_true'
				) );
			} );
		}
	}

	public function add_admin_menu() {
		add_menu_page(
			'Local To IP',
			'Local To IP',
			'manage_options',
			'local2ip',
			array($this, 'local2ip_settings_page'),
			'dashicons-admin-site',
			50
		);
	}

	public function local2ip_settings_page() {
		if ( wp_verify_nonce( sanitize_text_field( wp_unslash( @$_POST[ 'local2ip_nonce_field' ] ) ), 'local2ip_nonce' ) ) {
			$data = [
				'activation' => sanitize_text_field($_POST['activation']),
				'localip' => sanitize_text_field($_POST['localip'])
			];
			update_option('local2ip', $data);
		}

		$data = get_option('local2ip');

		include('template/dashboard.php');
	}



	public function delete_local2ip_callback() {
		delete_option( 'local2ip' );
		return wp_send_json_success( 'Option local2ip successfully deleted.' );
	}


	public function nqueue_admin_styles() {
		if (!strpos($_SERVER['REQUEST_URI'] ,'page=local2ip')) {return;}
		wp_enqueue_style('local2ip-admin-style', plugin_dir_url(__FILE__) . 'assets/style.css');
		wp_enqueue_script('local2ip-admin-script', plugin_dir_url(__FILE__) . 'assets/script.js', array('jquery'), null, true);
	}

	public function replace_urls_in_head() {
		ob_start(function($buffer) {
			$data = get_option('local2ip');

			$localhost_url = 'localhost';
			$local_ip_url = $data['localip'];

			$buffer = str_replace($localhost_url, $local_ip_url, $buffer);

			return $buffer;
		});
	}

	public function replace_localhost_with_ip($content) {
		$data = get_option('local2ip');

		$localhost_url = 'localhost';
		$local_ip_url = $data['localip'];
		return str_replace($localhost_url, $local_ip_url, $content);
	}

	public function local_to_ip_load_textdomain() {
		load_plugin_textdomain( 'local-to-ip', false, basename( dirname( __FILE__ ) ) . '/languages/' );
	}

}
new local_to_ip;