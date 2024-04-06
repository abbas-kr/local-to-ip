<?php if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly ?>
<div class="min-h-screen relative w-full flex items-center justify-center flex-col bg-gray-light overflow-hidden ghab-font">

    <!-- Blur Circle Start -->
    <div class="absolute top-0 -left-4 w-72 h-72 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob "></div>
    <div class="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
    <div class="absolute -bottom-32 left-24 w-72 h-72 bg-red-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
    <!-- Blur Circle End -->

    <!-- Main Container Start -->
    <div class="flex w-2/3 flex-col mt-6 relative z-10 bg-white px-4 py-2.5 rounded-lg ring-1 ring-inset ring-gray-100">
        <form method="post">
	        <?php wp_nonce_field('local2ip_nonce', 'local2ip_nonce_field'); ?>
            <ul role="list" class="divide-y divide-gray-100">

                <li class="flex justify-between gap-x-6 py-5">
                    <div class="flex min-w-0 gap-x-4">
                        <svg class="h-12 w-12 flex-none rounded-ful" width="24" height="24" viewBox="0 0 24 24"
                             fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                    d="M8.68006 12.72H10.4201V16.77C10.4201 17.37 11.1601 17.65 11.5601 17.2L15.8201 12.36C16.1901 11.94 15.8901 11.28 15.3301 11.28H13.5901V7.22995C13.5901 6.62995 12.8501 6.34995 12.4501 6.79995L8.19006 11.64C7.82006 12.06 8.12006 12.72 8.68006 12.72Z"
                                    stroke="#FF9900" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round"
                                    stroke-linejoin="round"/>
                            <path
                                    d="M11.97 22C17.4928 22 21.97 17.5228 21.97 12C21.97 6.47715 17.4928 2 11.97 2C6.44712 2 1.96997 6.47715 1.96997 12C1.96997 17.5228 6.44712 22 11.97 22Z"
                                    stroke="#FF9900" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round"
                                    stroke-linejoin="round"/>
                        </svg>

                        <div class="min-w-0 flex-auto">
                            <p class="text-sm font-semibold leading-6 text-gray-900"><?php _e('Status', 'local-to-ip'); ?></p>
                            <p class="mt-1 truncate text-xs leading-5 text-gray-500"><?php _e('set this plugin active or deactive', 'local-to-ip'); ?></p>
                        </div>
                    </div>

                    <div class="flex items-center justify-center bg-white">
                        <div x-data="{ on: <?php echo isset($data['activation']) && $data['activation'] === 'true' ? 'true' : 'false'; ?> }" class="ltr">
                            <button type="button"
                                    class="bg-gray-200 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
                                    role="switch" aria-checked="false" :aria-checked="on.toString()" @click="on = !on"
                                    x-state:on="Enabled" x-state:off="Not Enabled"
                                    :class="{ 'bg-indigo-600': on, 'bg-gray-200': !(on) }">
                                <span class="sr-only">Use setting</span>
                                <span
                                        class="translate-x-0 pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                                        x-state:on="Enabled" x-state:off="Not Enabled"
                                        :class="{ 'translate-x-5': on, 'translate-x-0': !(on) }">
                                        <span
                                                class="opacity-100 duration-200 ease-in absolute inset-0 flex h-full w-full items-center justify-center transition-opacity"
                                                aria-hidden="true" x-state:on="Enabled" x-state:off="Not Enabled"
                                                :class="{ 'opacity-0 duration-100 ease-out': on, 'opacity-100 duration-200 ease-in': !(on) }">
                                            <svg class="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 12 12">
                                                <path d="M4 8l2-2m0 0l2-2M6 6L4 4m2 2l2 2" stroke="currentColor"
                                                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                </path>
                                            </svg>
                                        </span>
                                        <span
                                                class="opacity-0 duration-100 ease-out absolute inset-0 flex h-full w-full items-center justify-center transition-opacity"
                                                aria-hidden="true" x-state:on="Enabled" x-state:off="Not Enabled"
                                                :class="{ 'opacity-100 duration-200 ease-in': on, 'opacity-0 duration-100 ease-out': !(on) }">
                                            <svg class="h-3 w-3 text-indigo-600" fill="currentColor"
                                                 viewBox="0 0 12 12">
                                                <path
                                                        d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 8l-.707.707a1 1 0 001.414 0L5 8zm4.707-3.293a1 1 0 00-1.414-1.414l1.414 1.414zm-7.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-4 4 1.414 1.414z">
                                                </path>
                                            </svg>
                                        </span>
                                    </span>
                            </button>

                            <input type="hidden" x-model="on" name="activation" value="<?php echo isset( $data['activation'] ) && $data['activation'] === 'true' ? 'true' : 'false'; ?>">
                        </div>

                    </div>
                </li>

                <li class="flex justify-between gap-x-6 py-5">
                    <div class="flex min-w-0 gap-x-4">
                        <svg class="h-12 w-12 flex-none rounded-ful" width="24" height="24" viewBox="0 0 24 24"
                             fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M16.96 6.17004C18.96 7.56004 20.34 9.77004 20.62 12.32" stroke="#EF4444"
                                  stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M3.48999 12.37C3.74999 9.82997 5.10999 7.61997 7.08999 6.21997"
                                  stroke="#EF4444" stroke-width="1.5" stroke-linecap="round"
                                  stroke-linejoin="round"/>
                            <path
                                    d="M8.19 20.9399C9.35 21.5299 10.67 21.8599 12.06 21.8599C13.4 21.8599 14.66 21.5599 15.79 21.0099"
                                    stroke="#EF4444" stroke-width="1.5" stroke-linecap="round"
                                    stroke-linejoin="round"/>
                            <path
                                    d="M12.06 7.70001C13.5954 7.70001 14.84 6.45537 14.84 4.92001C14.84 3.38466 13.5954 2.14001 12.06 2.14001C10.5247 2.14001 9.28003 3.38466 9.28003 4.92001C9.28003 6.45537 10.5247 7.70001 12.06 7.70001Z"
                                    stroke="#EF4444" stroke-width="1.5" stroke-linecap="round"
                                    stroke-linejoin="round"/>
                            <path
                                    d="M4.82999 19.92C6.36534 19.92 7.60999 18.6753 7.60999 17.14C7.60999 15.6046 6.36534 14.36 4.82999 14.36C3.29464 14.36 2.04999 15.6046 2.04999 17.14C2.04999 18.6753 3.29464 19.92 4.82999 19.92Z"
                                    stroke="#EF4444" stroke-width="1.5" stroke-linecap="round"
                                    stroke-linejoin="round"/>
                            <path
                                    d="M19.17 19.92C20.7054 19.92 21.95 18.6753 21.95 17.14C21.95 15.6046 20.7054 14.36 19.17 14.36C17.6347 14.36 16.39 15.6046 16.39 17.14C16.39 18.6753 17.6347 19.92 19.17 19.92Z"
                                    stroke="#EF4444" stroke-width="1.5" stroke-linecap="round"
                                    stroke-linejoin="round"/>
                        </svg>

                        <div class="min-w-0 flex-auto">
                            <p class="text-sm font-semibold leading-6 text-gray-900"><?php _e('Local Ip', 'local-to-ip'); ?></p>
                            <p class="mt-1 text-xs leading-5 text-gray-500"><?php _e('you can set local ip with <b>ipconfig</b> command in windows command line or <b>ifconfig</b> commad in unix base terminal.', 'local-to-ip'); ?></p>
                            <p class="mt-1 text-xs leading-5 text-gray-500"><?php _e('or can detect automatically', 'local-to-ip'); ?></p>
                        </div>
                    </div>

                    <div class="flex items-center justify-center bg-white">
                        <div class="flex items-center justify-center bg-white gap-x-4">
                            <input type="text" name="localip" id="localip"
                                   class="block w-full rounded-full border-0 px-4 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                   placeholder="ex: 192.168.1.100"
                                   pattern="\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b"
                                   value="<?php echo esc_attr( isset( $data['localip'] ) ? $data['localip'] : '' ); ?>" required>
                            <button data-modal-target="auto-detect-modal" data-modal-toggle="auto-detect-modal"
                                    type="button"
                                    class="w-2/3 rounded-full bg-green-50 px-3 py-2 text-sm font-semibold text-green-600 shadow-sm hover:bg-green-100">
		                        <?php _e('Auto Detect', 'local-to-ip'); ?>
                            </button>
                        </div>
                    </div>

                </li>

                <li class="flex justify-between gap-x-6 py-5">
                    <div class="flex min-w-0 gap-x-4">

                        <svg class="h-12 w-12 flex-none rounded-ful" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10.33 7.51001C10.83 7.36001 11.38 7.26001 12 7.26001C14.76 7.26001 17 9.50001 17 12.26C17 15.02 14.76 17.26 12 17.26C9.24 17.26 7 15.02 7 12.26C7 11.23 7.31 10.28 7.84 9.48001" stroke="#CD003E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M9.62 7.64999L11.28 5.73999" stroke="#CD003E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M9.62 7.6499L11.56 9.0699" stroke="#CD003E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" stroke="#CD003E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>


                        <div class="min-w-0 flex-auto">
                            <p class="text-sm font-semibold leading-6 text-gray-900"><?php _e('Force Deactive', 'local-to-ip'); ?></p>
                            <p class="mt-1 truncate text-xs leading-5 text-gray-500"><?php _e('You should save this link for emergencies. Click to Save Link:', 'local-to-ip'); ?>
                            </p>
                        </div>
                    </div>

                    <div class="flex items-center justify-center bg-white">
                        <p id="deactive-link" class="rounded-full bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 shadow-sm hover:bg-red-100"><?php echo esc_url(str_replace( @$data['localip'], 'localhost', get_home_url() ) . '/wp-json/local2ip/v1/deactive' ); ?></p>
                    </div>

                </li>

                <li class="flex justify-between gap-x-6 py-5">
                    <div class="flex min-w-0 gap-x-4">

                        <svg class="h-12 w-12 flex-none rounded-ful" width="24" height="24" viewBox="0 0 24 24"
                             fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                    d="M12.0001 9.32C13.1901 9.32 14.1601 8.35 14.1601 7.16C14.1601 5.97 13.1901 5 12.0001 5C10.8101 5 9.84009 5.97 9.84009 7.16C9.84009 8.35 10.8101 9.32 12.0001 9.32Z"
                                    stroke="#4F47E5" stroke-width="1.5" stroke-linecap="round"
                                    stroke-linejoin="round"/>
                            <path
                                    d="M6.78988 18.9999C7.97988 18.9999 8.94988 18.0299 8.94988 16.8399C8.94988 15.6499 7.97988 14.6799 6.78988 14.6799C5.59988 14.6799 4.62988 15.6499 4.62988 16.8399C4.62988 18.0299 5.58988 18.9999 6.78988 18.9999Z"
                                    stroke="#4F47E5" stroke-width="1.5" stroke-linecap="round"
                                    stroke-linejoin="round"/>
                            <path
                                    d="M17.21 18.9999C18.4 18.9999 19.37 18.0299 19.37 16.8399C19.37 15.6499 18.4 14.6799 17.21 14.6799C16.02 14.6799 15.05 15.6499 15.05 16.8399C15.05 18.0299 16.02 18.9999 17.21 18.9999Z"
                                    stroke="#4F47E5" stroke-width="1.5" stroke-linecap="round"
                                    stroke-linejoin="round"/>
                        </svg>

                        <div class="min-w-0 flex-auto">
                            <p class="text-sm font-semibold leading-6 text-gray-900"><?php _e('More info', 'local-to-ip'); ?></p>
                            <p class="mt-1 truncate text-xs leading-5 text-gray-500"><?php _e('you can contact us in:', 'local-to-ip'); ?>
                            </p>
                        </div>
                    </div>

                    <div class="flex items-center justify-center bg-white">
                        <a href="https://abbaskargar.ir" target="_blank"
                           class="rounded-full bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-100">
                            https://abbaskargar.ir
                        </a>
                    </div>

                </li>

                <li class="flex justify-between gap-x-6 py-5">
                    <div class="flex min-w-0 gap-x-4">

                    </div>

                    <div class="flex items-center justify-center bg-white">
                        <button type="submit"
                                class="rounded-full bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
	                        <?php _e('Save', 'local-to-ip'); ?>
                        </button>
                    </div>

                </li>

            </ul>
        </form>
    </div>
	<?php if ( isset($data['activation']) && $data['activation'] === 'true' && isset( $data['localip'] ) ) { ?>
        <div
                class="flex w-2/3 flex-col mt-6 relative z-10 bg-white px-4 py-2.5 rounded-lg ring-1 ring-inset ring-gray-100">
            <ul role="list" class="divide-y divide-gray-100">

                <li class="flex justify-between gap-x-6 py-5">
                    <div class="flex min-w-0 gap-x-4">

                        <svg class="h-12 w-12 flex-none rounded-ful" width="24" height="24" viewBox="0 0 24 24"
                             fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z"
                                  stroke="#10B981" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M7.75 12L10.58 14.83L16.25 9.17004" stroke="#10B981" stroke-width="1.5"
                                  stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>

                        <div class="min-w-0 flex-auto">
                            <p class="text-sm font-semibold leading-6 text-gray-900"><?php _e('availability', 'local-to-ip'); ?></p>
                            <p class="mt-1 truncate text-xs leading-5 text-gray-500"><?php _e('your wordpress site is availbale on', 'local-to-ip'); ?>
                            </p>
                        </div>
                    </div>

                    <div class="flex items-center justify-center bg-white">
                        <a href="<?php echo esc_url( 'http://' . $data['localip'] ); ?>" target="_blank"
                           class="rounded-full bg-green-50 px-3 py-2 text-sm font-semibold text-green-600 shadow-sm hover:bg-green-100">
	                        <?php echo esc_html( 'http://' . $data['localip'] ); ?>
                        </a>
                    </div>

                </li>
            </ul>
        </div>
	<?php } ?>
</div>
<!-- Main modal -->
<div id="auto-detect-modal" tabindex="-1" aria-hidden="true"
     class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
    <div class="relative p-4 w-full max-w-2xl max-h-full">
        <!-- Modal content -->
        <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">
            <ul role="list" class="divide-y divide-gray-100">
                <li class="flex justify-between gap-x-6 py-5">
                    <p class="ms-3 mt-1 truncate text-xs leading-5 text-gray-500"><?php _e('we found this ips, select correct one', 'local-to-ip'); ?></p>
                </li>
				<?php
				foreach ( $this->getNetworkIPAddresses() as $ip ) {
					$esc_ip = esc_html( $ip );
					?>
                    <li class="flex justify-between gap-x-6 py-2">
                        <button data-modal-hide="auto-detect-modal" type="button" data-value="<?php echo $esc_ip; ?>"
                                class="ms-3 text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-600">
                            <?php echo $esc_ip; ?>
                        </button>
                    </li>
					<?php
				}
				?>
            </ul>

        </div>
    </div>
</div>