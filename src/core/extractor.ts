import fs from 'fs-extra';

export interface ExtractedString {
  key: string;
  original: string;
  pattern: string;
  context: string;
  category: string;
  confidence: 'high' | 'medium';
}

/**
 * Known UI strings organized by category.
 * These are confirmed to exist in Claude Code's cli.js bundle.
 */
export const KNOWN_STRINGS: Record<string, Record<string, string>> = {
  permissions: {
    allow: 'Allow',
    deny: 'Deny',
    ask: 'Ask',
    yes_allow_external: 'Yes, allow external imports',
    no_disable_external: 'No, disable external imports',
    yes_trust_settings: 'Yes, I trust these settings',
    yes_for_session: 'Yes, for this session',
    yes_remember_dir: 'Yes, and remember this directory',
    yes_delete: 'Yes, delete',
    yes_during_session: 'Yes, during this session',
    yes_allow_all_edits_session: 'Yes, allow all edits during this session',
    yes_use_auto_mode: 'Yes, and use auto mode',
    yes_bypass_permissions: 'Yes, and bypass permissions',
    yes_auto_accept: 'Yes, auto-accept edits',
    yes_manually_approve: 'Yes, manually approve edits',
    yes_enter_plan_mode: 'Yes, enter plan mode',
    yes_use_recommended: 'Yes, use recommended settings',
    yes_trust_folder: 'Yes, I trust this folder',
    yes_accept: 'Yes, I accept',
    yes_enable_auto: 'Yes, enable auto mode',
    yes_make_default: 'Yes, and make it my default mode',
    no_exit: 'No, exit',
    no_cancel: 'No, cancel',
    no_keep_tag: 'No, keep tag',
    no_not_now: 'No, not now',
    no_go_back: 'No, go back',
    no_keep_planning: 'No, keep planning',
    no_start_implementing: 'No, start implementing now',
    no_exit_claude: 'No, exit Claude Code',
    no_tell_differently: 'No, and tell Claude what to do differently ',
    waiting_permission: 'Waiting for permission\u2026',
    do_you_proceed: 'Do you want to proceed?',
    no_code_changes_until_approve: 'No code changes will be made until you approve the plan.',
    allowed_by_auto: 'Allowed by auto mode classifier',
    settings_requiring_approval: 'Settings requiring approval:',
    allow_fetch_content: 'Do you want to allow Claude to fetch this content?',
    allow_connection: 'Do you want to allow this connection?',
    make_edit_to: 'Do you want to make this edit to',
    confirm_delete_agent: 'Are you sure you want to delete the agent',
    yes_allow_all_edits_in: 'Yes, allow all edits in ',
    yes_allow_reading_from: 'Yes, allow reading from ',
    yes_allow_edit_settings: 'Yes, and allow Claude to edit its own settings for this session',
  },

  modes: {
    default_mode: 'Default',
    plan_mode: 'Plan Mode',
    plan_short: 'Plan',
    accept_edits: 'Accept edits',
    accept_short: 'Accept',
    bypass_permissions: 'Bypass Permissions',
    bypass_short: 'Bypass',
    dont_ask: "Don't Ask",
    dont_ask_short: 'DontAsk',
    auto_mode: 'Auto mode',
    auto_short: 'Auto',
    default_recommended: 'Default (recommended)',
    default_permission_mode: 'Default permission mode',
    thinking_mode: 'Thinking mode',
  },

  status: {
    thinking: '\u273b Thinking\u2026',
    compacting: 'Compacting conversation\u2026',
    running: 'Running\u2026 ',
    running_alt: 'Running ',
    connecting: 'connecting\u2026',
    loading: 'Loading\u2026',
    loading_conversations: ' Loading conversations\u2026',
    loading_session: 'Loading session\u2026',
    loading_stats: ' Loading stats\u2026',
    loading_your_stats: ' Loading your Claude Code stats\u2026',
    loading_diff: 'Loading diff\u2026',
    loading_explanation: 'Loading explanation\u2026',
    loading_output: 'Loading output\u2026',
    loading_plugins: 'Loading installed plugins\u2026',
    loading_usage: 'Loading usage data\u2026',
    loading_environments: 'Loading environments\u2026',
    searching: ' Searching\u2026',
    searching_claude: 'Searching with Claude\u2026',
    search: 'Search\u2026',
    resuming: ' Resuming conversation\u2026',
    resuming_session: 'Resuming session\u2026',
    initializing: 'Initializing\u2026',
    installing: 'Installing\u2026',
    processing: 'Processing\u2026',
    processing_auth: 'Processing authentication\u2026',
    processing_changes: 'Processing changes\u2026',
    updating: 'Updating\u2026',
    auto_updating: 'Auto-updating\u2026',
    fetching: 'Fetching\u2026',
    saving_session: 'Saving session\u2026',
    summarizing: 'Summarizing\u2026',
    voice_processing: 'Voice: processing\u2026',
    please_wait: 'Please wait\u2026',
    pasting_text: 'Pasting text\u2026',
    teleporting: ' Teleporting session\u2026',
    interrupted: 'Interrupted ',
    task_running: 'Task is still running\u2026',
    summarized_conversation: 'Summarized conversation',
    no_changes_detected: 'No changes detected',
    debug_mode_enabled: 'Debug mode enabled',
    this_may_take_moment: 'This may take a moment.',
    this_may_take_moments: 'This may take a few moments.',
    ultraplanning: 'Ultraplanning\u2026',
    churning: 'Churning',
    computing: 'Computing',
    generating: 'Generating',
    working: 'Working',
    retrying: 'Retrying\u2026',
    waiting: 'Waiting\u2026',
    running_no_space: 'Running\u2026',
    compacting_no_ellipsis: 'Compacting conversation',
    searching_prefix: 'Searching: ',
    running_background: 'Running in the background',
    loading_cc_sessions: 'Loading Claude Code sessions\u2026',
    fetching_cc_sessions: 'Fetching your Claude Code sessions\u2026',
    loading_marketplaces: 'Loading marketplaces\u2026',
    loading_marketplaces_dots: 'Loading marketplaces...',
    loading_thinkback: 'Loading thinkback skill\u2026',
    generating_qr: 'Generating QR code\u2026',
    loading_guest_pass: 'Loading guest pass information\u2026',
    migrating_native: 'Migrating to native installation\u2026',
    pending_changes: 'Pending changes:',
    idle: 'Idle',
    running_feedback: 'Running feedback capture...',
    waiting_team_lead: 'Waiting for team lead approval',
    loading_output_styles: 'Loading output styles\u2026',
    validating_session: 'Validating session',
    exploring_approach: 'Claude is now exploring and designing an implementation approach.',
    teammate_continuing: 'Teammate is continuing to work. You may request shutdown again later.',
    checking_connectivity: 'Checking connectivity...',
    checking_updates: 'Checking for updates',
    checking_install: 'Checking installation status\u2026',
    establishing_mcp: ' Establishing connection to MCP server',
    restarting_mcp: ' Restarting MCP server process',
    starting_auth: 'Starting authentication\u2026',
    generating_agent: ' Generating agent from description...',
    running_validation: 'Running validation...',
    submitting_report: 'Submitting report\u2026',
    validating_repo: ' Validating repository\u2026',
    opening_browser_signin: 'Opening browser to sign in\u2026',
    opening_browser_anthropic: 'Opening browser to sign in with your Claude account\u2026',
    setting_up_launcher: 'Setting up launcher and shell integration...',
    teleporting_session: 'Teleporting to session\u2026',
    cleaning_npm: 'Cleaning up old npm installations...',
    disabling_ellipsis: 'Disabling\u2026',
    uninstalling_ellipsis: 'Uninstalling\u2026',
    removing_worktree: 'Removing worktree\u2026',
    updating_marketplace: 'Updating marketplace\u2026',
    credit_balance_low: 'Credit balance too low \u00b7 Add funds: https://platform.claude.com/settings/billing',
    not_logged_in: 'Not logged in \u00b7 Run /login',
    usage_sub_only: '/usage is only available for subscription plans.',
    extra_usage_not_enabled: 'Extra usage not enabled \u2022 /extra-usage to enable',
    now_using_extra: 'Now using extra usage',
    voice_available: ' Voice mode is now available \u00b7 /voice to enable',
    no_recent_activity: 'No recent activity',
    no_changed_files: 'No changed files',
    no_code_changes: 'No code changes',
    try_cc_desktop_desc: 'Same Claude Code with visual diffs, live app preview, parallel sessions, and more.',
    reading_file: 'Reading file',
    writing_file: 'Writing file',
    editing_file: 'Editing file',
    editing_notebook: 'Editing notebook',
  },

  prompts: {
    press_enter_continue: 'Press Enter to continue',
    press_enter_verify: 'Press Enter when ready to verify\u2026',
    press_any_key_continue: 'Press any key to continue\u2026',
    press_any_key_exit: 'Press any key to exit',
    type_something: 'Type something\u2026',
    esc_go_back: 'Esc to go back',
    save_close_continue: 'Save and close editor to continue...',
    save_file_continue: 'Save file to continue\u2026',
    search_settings: 'Search settings...',
    review_answers: 'Review your answers',
    return_after_auth: 'Return here after authenticating in your browser. Press Esc to go back.',
    press_enter_ctrlc: 'Press Enter to continue anyway, or Ctrl+C to exit and fix issues',
    stash_teleport: 'Would you like to stash these changes and continue with teleport?',
    edit_retry_esc: 'Edit and press Enter to retry, or Esc to cancel',
    nav_enter_select_esc_back: 'Press \u2191\u2193 to navigate \u00b7 Enter to select \u00b7 Esc to go back',
    nav_type_search_esc: 'Press \u2191\u2193 to navigate \u00b7 Enter to select \u00b7 Type to search \u00b7 Esc to cancel',
    nav_select_esc_cancel: 'Press \u2191\u2193 to navigate, Enter to select, Esc to cancel',
    up_down_enter_continue: '\u2191/\u2193 to select \u00b7 Enter to continue',
    esc_additional: '(esc to give additional instructions)',
    tab_switch_esc_close: '(tab to switch, esc to close)',
    press_esc_close: '(press esc to close)',
    double_tap_esc: 'double tap esc to clear input',
  },

  tools: {
    view_tools: 'View tools',
    edit_file: 'Edit file',
    create_file: 'Create file',
  },

  errors: {
    file_not_found: 'File not found',
    error_reading_file: 'Error reading file',
    error_searching_files: 'Error searching files',
    installation_failed: 'Installation failed',
    verification_failed: 'Verification failed',
    no_network: 'No network connectivity. Check your internet connection.',
    remote_control_failed: 'Remote Control failed',
    no_clipboard_image: "No image found in clipboard. You're SSH'd; try scp?",
    pdf_protected: 'PDF is password-protected. Please provide an unprotected version.',
    gh_not_installed: 'GitHub CLI (gh) does not appear to be installed or accessible.',
    no_changes_same: 'No changes to make: old_string and new_string are exactly the same.',
    file_denied_settings: 'File is in a directory that is denied by your permission settings.',
    sandbox_not_enabled: 'Sandbox is not enabled. Enable sandbox to configure override settings.',
  },

  actions: {
    try_again: 'Try again',
    not_now: 'Not now',
    never_mind: 'Never mind',
    exit_fix_manually: 'Exit and fix manually',
    restore_conversation: 'Restore conversation',
    help_improve: 'Help improve Claude',
    clear_auth: 'Clear authentication',
    open_homepage: 'Open homepage',
    back_to_list: 'Back to plugin list',
    manage_marketplaces: 'Manage marketplaces',
    select_marketplace: 'Select marketplace',
    discover_plugins: 'Discover plugins',
    add_marketplace: 'Add Marketplace',
    install_github_app: 'Install GitHub App',
    save_to_file: 'Save to file',
    confirm_and_save: 'Confirm and save',
    view_release_notes: 'View release notes',
    try_plugin_install: 'Try running /plugin to manually install the think-back plugin.',
  },

  info: {
    version: 'Version: ',
    status_prefix: 'Status: ',
    command_prefix: 'Command: ',
    location: 'Location: ',
    config_location: 'Config location: ',
    tools_prefix: 'Tools: ',
    auth_prefix: 'Auth: ',
    url_prefix: 'URL: ',
    no_hooks_configured: 'No hooks configured for this event.',
    add_hooks_hint: 'To add hooks, edit settings.json directly or ask Claude.',
    no_matching_sessions: 'No matching sessions found.',
    no_conversations_found: 'No conversations found to resume.',
    no_scheduled_jobs: 'No scheduled jobs.',
    no_tasks_found: 'No tasks found',
    no_tasks_running: 'No tasks currently running',
    no_agents_found: 'No agents found.',
    no_skills_found: 'No skills found',
    no_stats_yet: 'No stats available yet. Start using Claude Code!',
    built_in_agents: 'Built-in agents',
    system_prompt: 'System prompt',
    suggestions: 'Suggestions ',
    plan_to_implement: 'Plan to implement',
    no_preview: 'No preview available',
    working_tree_clean: 'Working tree is clean',
    working_dir_changes: 'Working Directory Has Changes',
    showing_transcript: 'Showing detailed transcript \u00b7 ',
    no_plugins: 'No plugins available.',
    git_required: 'Git is required to install marketplaces.',
    environment_prefix: 'Environment: ',
    session_prefix: 'Session: ',
    source_prefix: 'Source: ',
    scope_prefix: 'Scope: ',
    type_prefix: 'Type: ',
    connected: 'Connected',
    disconnected: 'Disconnected',
    multiple_sessions_hint: 'Running multiple Claude sessions? Use /color and /rename to tell them apart at a glance.',
    recent_activity: 'Recent activity',
    whats_new: "What's new",
    opus_announcement: 'Opus now defaults to 1M context \u00b7 5x more room, same pricing',
    no_agents_detailed: 'No agents found. Create specialized subagents that Claude can delegate to.',
    built_in_agents_readonly: 'Built-in agents are provided by default and cannot be modified.',
    org_no_marketplaces: 'Your organization policy does not allow any external marketplaces.',
    no_access_directory: 'Claude Code will no longer have access to files in this directory.',
    browser_url_hint: "If your browser doesn't open automatically, copy this URL manually:",
    model_determines_speed: "Model determines the agent's reasoning capabilities and speed.",
    install_collaborators: 'Install for all collaborators on this repository (project scope)',
    grant_access_repo: 'Important: Make sure to grant access to this specific repository',
    prompt_injection_warning: 'Due to prompt injection risks, only use it with code you trust',
    enter_agent_id: 'Enter a unique identifier for your agent:',
    enter_system_prompt: 'Enter the system prompt for your agent:',
    when_use_agent: 'When should Claude use this agent?',
    try_creating_agents: 'Try creating: Code Reviewer, Code Simplifier, Security Reviewer, Tech Lead, or UX Reviewer.',
    subagent_own_context: 'Each subagent has its own context window, custom system prompt, and specific tools.',
  },

  billing: {
    pro_max_team: 'Pro, Max, Team, or Enterprise',
    api_billing: 'API usage billing',
    third_party: 'Amazon Bedrock, Microsoft Foundry, or Vertex AI',
    using_third_party: 'Using 3rd-party platforms',
    configure_extra: 'Configure extra usage to keep working when limits are hit',
    high_demand_opus: 'We are experiencing high demand for Opus 4.',
  },

  models: {
    opus_1m: 'Opus (1M context)',
    sonnet_1m: 'Sonnet (1M context)',
  },

  startup: {
    welcome: 'Welcome to Claude Code',
    ready_to_code: 'Ready to code?',
    press_up_edit_queued: 'Press up to edit queued messages',
    welcome_back: 'Welcome back!',
  },

  try_suggestions: {
    fix_lint: 'fix lint errors',
    fix_typecheck: 'fix typecheck errors',
    how_log_error: 'how do I log an error?',
    create_util: 'create a util logging.py that...',
  },

  goodbye: {
    goodbye: 'Goodbye!',
    see_ya: 'See ya!',
    bye: 'Bye!',
    catch_you_later: 'Catch you later!',
  },

  hints: {
    esc_cancel: 'Esc to cancel',
    enter_confirm_esc_cancel: 'Enter to confirm \u00b7 Esc to cancel',
    enter_copy_esc_cancel: 'Enter to copy link \u00b7 Esc to cancel',
    tab_enter_esc: 'Tab to toggle \u00b7 Enter to confirm \u00b7 Esc to cancel',
    enter_submit_esc_cancel: 'Enter to submit \u00b7 Esc to cancel',
    esc_close: 'Esc to close',
    esc_exit: 'Esc to exit',
    enter_continue: 'Enter to continue',
    enter_select_esc_continue: 'Enter to select \u00b7 Esc to continue',
    enter_view: 'Enter to view',
    enter_apply: 'Enter to apply',
    ctrl_g_edit: ' \u00b7 ctrl+g to edit in ',
    ctrl_s_copy: ' \u00b7 ctrl+s to copy',
    enter_to_view: ' \u00b7 Enter to view',
    tab_to_amend: ' \u00b7 Tab to amend',
    tab_switch_questions: ' \u00b7 Tab to switch questions',
    enter_to_collapse: ' \u00b7 enter to collapse',
    back_esc_kill_shutdown: ' back \u00b7 Esc close \u00b7 k kill \u00b7 s shutdown',
    select_enter_kill_shutdown: ' select \u00b7 Enter view \u00b7 k kill \u00b7 s shutdown \u00b7 p prune idle',
    left_right_adjust: '\u2190 \u2192 to adjust',
    left_right_source: '\u2190/\u2192 source',
    what_claude_do: '\u00b7 What should Claude do instead?',
    p_to_expand: ' (p to expand)',
    arrow_to_expand: '\u2192 to expand',
  },

  plan: {
    here_is_plan: "Here is Claude's plan:",
    plan_saved: 'Plan saved!',
    plan_updated: 'Plan updated',
    plan_needs_revision: 'Plan needs revision',
    revise_plan: 'Please revise your plan based on the feedback and call ExitPlanMode again.',
    teleport_changes: 'Teleport will switch git branches. The following changes were found:',
    claude_ready_execute: 'Claude has written up a plan and is ready to execute. Would you like to proceed?',
    claude_wants_plan: 'Claude wants to enter plan mode to explore and design an implementation approach.',
    claude_wants_exit_plan: 'Claude wants to exit plan mode',
    entered_plan: 'Entered plan mode. You should now focus on exploring the codebase and designing an implementation approach.',
    exited_plan: ' Exited plan mode',
    restrictions_lifted: 'You can now proceed with implementation. Your plan mode restrictions have been lifted.',
    in_plan_will: 'In plan mode, Claude will:',
    design_strategy: ' \u00b7 Design an implementation strategy',
    explore_codebase: ' \u00b7 Explore the codebase thoroughly',
    identify_patterns: ' \u00b7 Identify existing patterns',
    present_plan: ' \u00b7 Present a plan for your approval',
    plan_submitted: ' Plan submitted for team lead approval',
    user_approved_plan: " User approved Claude's plan",
    user_rejected_plan: "User rejected Claude's plan:",
    user_declined_plan: ' User declined to enter plan mode',
    waiting_team_lead: 'Waiting for team lead to review and approve...',
  },

  settings: {
    back: 'Back',
    cancel: 'Cancel',
    continue_btn: 'Continue',
    exit: 'Exit',
    yes: 'Yes',
    enable: 'Enable',
    disable: 'Disable',
    enabled: 'Enabled',
    disabled: 'Disabled',
    none: 'None',
    other: 'Other',
    configure: 'Configure',
    authenticate: 'Authenticate',
    re_authenticate: 'Re-authenticate',
    reconnect: 'Reconnect',
    regenerate: 'Regenerate',
    uninstall: 'Uninstall',
    fix_errors: 'Fix errors',
    copy_to_clipboard: 'Copy to clipboard',
    submit_answers: 'Submit answers',
    confirm_and_save: 'Confirm and save',
    save_to_file: 'Save to file',
    update_now: 'Update now',
    upgrade_plan: 'Upgrade your plan',
    lets_go: "Let's go!",
    got_it_thanks: 'Got it, thanks!',
    dont_ask_again: "Don't ask again",
    yes_remove_tag: 'Yes, remove tag',
    yes_dont_ask_for: "Yes, and don't ask again for",
    no_maybe_later: 'No, maybe later with /terminal-setup',
    continue_without_settings: 'Continue without these settings',
    continue_without_mcp: 'Continue without using this MCP server',
    exit_without_changes: 'Exit without making changes',
    stash_and_continue: 'Stash changes and continue',
    stop_wait_limit: 'Stop and wait for limit to reset',
    play_animation: 'Play animation',
    view_release_notes: 'View release notes',
    summarize_from_here: 'Summarize from here',
    full_response: 'Full response',
    restore_code: 'Restore code',
    restore_code_conversation: 'Restore code and conversation',
    open_in_editor: 'Open in editor',
    open_in_cc_desktop: 'Open in Claude Code Desktop',
    open_auto_memory: 'Open auto-memory folder',
    open_team_memory: 'Open team memory folder',
    view_on_github: 'View on GitHub',
    view_repository: 'View repository',
    view_agent: 'View agent',
    edit_agent: 'Edit agent',
    delete_agent: 'Delete agent',
    edit_color: 'Edit color',
    edit_content: 'Edit content',
    edit_model: 'Edit model',
    edit_tools: 'Edit tools',
    install_chrome_ext: 'Install Chrome extension',
    install_user_scope: 'Install for you (user scope)',
    install_local_scope: 'Install for you, in this repo only (local scope)',
    install_it2: 'Install it2 now',
    install_collaborators: 'Install for all collaborators on this repository (project scope)',
    remove_marketplace: 'Remove marketplace',
    update_marketplace: 'Update marketplace',
    use_mcp_server: 'Use this MCP server',
    use_all_future_mcp: 'Use this and all future MCP servers in this project',
    use_tmux: 'Use tmux instead',
    keep_worktree: 'Keep worktree',
    keep_worktree_tmux: 'Keep worktree and tmux session',
    keep_worktree_kill_tmux: 'Keep worktree, kill tmux session',
    remove_worktree: 'Remove worktree',
    remove_worktree_tmux: 'Remove worktree and tmux session',
    reset_default_config: 'Reset with default configuration',
    generate_with_claude: 'Generate with Claude (recommended)',
    manual_configuration: 'Manual configuration',
    inherit_from_parent: 'Inherit from parent',
    theme: 'Theme',
    language: 'Language',
    dark_mode: 'Dark mode',
    dark_mode_ansi: 'Dark mode (ANSI colors only)',
    dark_mode_colorblind: 'Dark mode (colorblind-friendly)',
    light_mode: 'Light mode',
    light_mode_ansi: 'Light mode (ANSI colors only)',
    light_mode_colorblind: 'Light mode (colorblind-friendly)',
    reduce_motion: 'Reduce motion',
    output_style: 'Output style',
    what_you_see: 'What you see by default',
    verbose_output: 'Verbose output',
    terminal_progress: 'Terminal progress bar',
    show_tips: 'Show tips',
    show_pr_footer: 'Show PR status footer',
    prompt_suggestions: 'Prompt suggestions',
    always_copy_full: 'Always copy full response',
    always_copy_skip: 'Always copy full response (skip /copy picker)',
    editor_mode: 'Editor mode',
    diff_tool: 'Diff tool',
    model: 'Model',
    haiku: 'Haiku',
    opus: 'Opus',
    opus_41: 'Opus 4.1',
    sonnet: 'Sonnet',
    opus_plan_mode: 'Opus Plan Mode',
    login_method: 'Login method',
    login_claude_account: 'Login with Claude account',
    email: 'Email',
    organization: 'Organization',
    api_key: 'API key',
    api_provider: 'API provider',
    auth_token: 'Auth token',
    auto_compact: 'Auto-compact',
    auto_connect_ide: 'Auto-connect to IDE (external terminal)',
    auto_install_ide: 'Auto-install IDE extension',
    auto_update_channel: 'Auto-update channel',
    enable_with_latest: 'Enable with latest channel',
    enable_with_stable: 'Enable with stable channel',
    allow_downgrade: 'Allow possible downgrade to stable version',
    notifications: 'Notifications',
    respect_gitignore: 'Respect .gitignore in file picker',
    rewind_checkpoints: 'Rewind code (checkpoints)',
    disable_lsp: 'Disable all LSP recommendations',
    proxy: 'Proxy',
    anthropic_base_url: 'Anthropic base URL',
    bedrock_base_url: 'Bedrock base URL',
    vertex_base_url: 'Vertex base URL',
    foundry_base_url: 'Microsoft Foundry base URL',
    foundry_resource: 'Microsoft Foundry resource',
    aws_region: 'AWS region',
    default_region: 'Default region',
    gcp_project: 'GCP project',
    additional_ca: 'Additional CA cert(s)',
    mtls_cert: 'mTLS client cert',
    mtls_key: 'mTLS client key',
    session_id: 'Session ID',
    session_name: 'Session name',
    version: 'Version',
    setting_sources: 'Setting sources',
    individual_tools: 'Individual Tools:',
    mcp_servers: 'MCP servers',
    mcp_servers_colon: 'MCP Servers:',
    built_in_mcps: 'Built-in MCPs',
    enterprise_mcps: 'Enterprise MCPs',
    local_mcps: 'Local MCPs',
    project_mcps: 'Project MCPs',
    user_mcps: 'User MCPs',
    local_agents: 'Local agents',
    managed_agents: 'Managed agents',
    plugin_agents: 'Plugin agents',
    project_agents: 'Project agents',
    user_agents: 'User agents',
    cli_arg_agents: 'CLI arg agents',
    personal_agents: 'Personal (~/.claude/agents/)',
    project_agents_path: 'Project (.claude/agents/)',
    project_settings: 'Project settings',
    project_settings_local: 'Project settings (local)',
    user_settings: 'User settings',
    ext_claude_md: 'External CLAUDE.md includes',
    device_managed: 'device-level managed preferences',
    per_user_managed: 'per-user managed preferences',
    none_no_memory: 'None (no persistent memory)',
    enable_project_memory: 'Enable (.claude/agent-memory/) (Recommended)',
    enable_user_memory: 'Enable (~/.claude/agent-memory/) (Recommended)',
    local_scope_memory: 'Local scope (.claude/agent-memory-local/)',
    project_scope_memory: 'Project scope (.claude/agent-memory/)',
    user_scope_memory: 'User scope (~/.claude/agent-memory/)',
    remote_active: 'Remote Control active',
    remote_connecting: 'Remote Control connecting…',
    remote_reconnecting: 'Remote Control reconnecting',
    enable_remote_all: 'Enable Remote Control for all sessions',
    enable_remote_session: 'Enable Remote Control for this session',
    morning: 'Morning (6-12)',
    afternoon: 'Afternoon (12-18)',
    evening: 'Evening (18-24)',
    night: 'Night (0-6)',
    checking_branch: 'Checking out branch',
    getting_branch: 'Getting branch info',
    fetching_logs: 'Fetching session logs',
    skip_workflow: 'Skip workflow update (configure secrets only)',
    update_workflow: 'Update workflow file with latest version',
    chrome_enabled: 'Claude in Chrome enabled by default',
    accept_terms_off: 'Accept terms • Help improve Claude: OFF',
    accept_terms_off_domain: 'Accept terms • Help improve Claude: OFF (for emails with your domain)',
    accept_terms_on: 'Accept terms • Help improve Claude: ON',
  },

  titles: {
    config: 'Config',
    status_title: 'Status',
    login: 'Login',
    log_in_claude: 'Log in to Claude',
    mode_title: 'Mode',
    models_title: 'Models',
    memory_title: 'Memory',
    plugins_title: 'Plugins',
    skills_title: 'Skills',
    hooks_title: 'Hooks',
    usage_title: 'Usage',
    workspace_title: 'Workspace',
    overview_title: 'Overview',
    overrides_title: 'Overrides',
    discover_title: 'Discover',
    installed_title: 'Installed',
    marketplaces_title: 'Marketplaces',
    dependencies_title: 'Dependencies',
    permissions_title: 'Permissions:',
    sandbox_title: 'Sandbox:',
    tool_use_title: 'Tool use',
    remote_control_title: 'Remote Control',
    remote_session_details: 'Remote session details',
    current_session: 'Current session',
    current_week_all: 'Current week (all models)',
    current_week_sonnet: 'Current week (Sonnet only)',
    background_tasks: 'Background tasks',
    data_privacy: 'Data Privacy',
    export_conversation: 'Export Conversation',
    submit_feedback: 'Submit Feedback / Bug Report',
    create_agent: 'Create new agent',
    manage_mcp: 'Manage MCP servers',
    import_mcp: 'Import MCP Servers from Claude Desktop',
    what_to_do: 'What do you want to do?',
    enable_auto_mode: 'Enable auto mode?',
    enable_auto_updates: 'Enable Auto-Updates',
    enter_plan_mode: 'Enter plan mode?',
    exit_plan_mode: 'Exit plan mode?',
    exiting_worktree: 'Exiting worktree session',
    select_ide: 'Select IDE',
    select_ide_open: 'Select an IDE to open the project',
    select_ide_install: 'Select IDE to install extension',
    select_workflows: 'Select GitHub workflows to install',
    allow_ext_claude_md: 'Allow external CLAUDE.md file imports?',
    enable_disable_ide: 'Do you wish to enable auto-connect to IDE?',
    disable_ide: 'Do you wish to disable auto-connect to IDE?',
    autocompact_disabled: 'Autocompact is disabled',
    config_error: 'Configuration Error',
    settings_error: 'Settings Error',
    detected_api_key: 'Detected a custom API key in your environment',
    gh_not_auth: 'GitHub CLI not authenticated',
    gh_not_found: 'GitHub CLI not found',
    hook_details: 'Hook details',
    hook_disabled: 'Hook Configuration - Disabled',
    lsp_recommendation: 'LSP Plugin Recommendation',
    network_outside_sandbox: 'Network request outside of sandbox',
    preferred_style: 'Preferred output style',
    bypass_warning: 'WARNING: Claude Code running in Bypass Permissions mode',
    add_dir_workspace: 'Add directory to workspace',
    remove_dir_workspace: 'Remove directory from workspace?',
    remove_tag: 'Remove tag?',
    teleport_repo: 'Teleport to Repo',
    switch_stable: 'Switch to Stable Channel',
    admin_required: 'Admin permissions required',
    invalid_gh_url: 'Invalid GitHub URL format',
    repo_format_warn: 'Repository format warning',
    repo_not_found: 'Repository not found',
    claude_chrome: 'Claude in Chrome (Beta)',
    try_cc_desktop: 'Try Claude Code Desktop',
    guest_passes: '3 guest passes',
    terms_update: 'Updates to Consumer Terms and Policies',
    api_spent: "You've spent $5 on the Anthropic API this session.",
    tips_getting_started: 'Tips for getting started',
    browse_custom_cmds: 'Browse custom commands:',
    browse_default_cmds: 'Browse default commands:',
    fetch_title: 'Fetch',
    tabs_context: 'Tabs Context',
    tabs_create: 'Tabs Create',
    thinkback: 'Think Back on 2025 with Claude Code',
    iterm_split_pane: 'iTerm2 Split Pane Setup',
  },

  subtitles: {
    agent_type: 'Agent type (identifier)',
    choose_bg_color: 'Choose background color',
    choose_location: 'Choose location',
    configure_memory: 'Configure agent memory',
    connect_ide: 'Connect to an IDE for integrated development features.',
    creation_method: 'Creation method',
    agent_description: 'Description (tell Claude when to use this agent)',
    no_agents_sub: 'No agents found',
    select_enable: 'Select any you wish to enable.',
    select_export: 'Select export method:',
    select_model: 'Select model',
    select_tools: 'Select tools',
    workflow_create: "We'll create a workflow file in your repository for each one you select.",
    also_in_config: 'You can also configure this in /config',
    thinkback_gen: 'Generate your 2025 Claude Code Think Back (takes a few minutes to run)',
  },

  placeholders: {
    add_context: 'add context (optional)',
    add_notes: 'Add notes on this design…',
    tell_differently: 'and tell Claude what to do differently',
    tell_next: 'and tell Claude what to do next',
    command_prefix: 'command prefix (e.g., npm run:*)',
    type_to_change: 'Type here to tell Claude what to change',
    enter_repo: 'Enter a repo as owner/repo or https://github.com/owner/repo…',
  },

  user_messages: {
    claude_waiting: 'Claude is waiting for your input',
    copied_clipboard: 'Conversation copied to clipboard',
    screenshot_copied: 'Screenshot copied to clipboard',
    export_cancelled: 'Export cancelled',
    login_successful: 'Claude Code login successful',
    invalid_code: 'Invalid code. Please make sure the full code was copied',
    close_limit: "You're close to your extra usage spending limit",
    animation_complete: 'Year in review animation complete!',
    effort_auto: 'Effort level set to auto',
    effort_auto_label: 'Effort level: auto',
    failed_auth: 'Failed to authenticate',
    failed_copy: 'Failed to copy to clipboard. Please install xclip or xsel: sudo apt install xclip',
    failed_load_plugins: 'Failed to load plugins',
    failed_load_stats: 'Failed to load stats',
    failed_load_markets: 'Failed to load marketplaces',
    failed_save_agent: 'Failed to save agent',
    failed_github_actions: 'Failed to set up GitHub Actions',
    failed_update_setting: 'Failed to update setting',
    failed_check_plugin: 'Failed to check plugin update availability',
    gh_not_auth_msg: 'GitHub CLI does not appear to be authenticated.',
    no_teammates: 'No teammates to broadcast to (you are the only team member)',
    guidance_restart: 'Restart to retry loading plugins',
    all_plugins_installed: 'All available plugins are already installed.',
    all_marketplace_installed: 'All plugins from this marketplace are already installed.',
    no_new_plugins: 'No new plugins available to install.',
    no_plugins_mcp: 'No plugins or MCP servers installed.',
    no_marketplaces: 'No marketplaces configured.',
    no_enabled_disable: 'No enabled plugins to disable',
    check_new_plugins: 'Check for new plugins later or add more marketplaces.',
    reload_apply: 'Run /reload-plugins to apply changes',
    org_restrict_marketplaces: 'Your organization restricts which marketplaces can be added.',
    can_anthropic_look: 'Can Anthropic look at your session transcript to help us improve Claude Code?',
    terms_updated: "We've updated our Consumer Terms and Privacy Policy.",
    terms_apply: 'Terms apply.',
    help_improve_claude: 'You can help improve Claude ',
    store_token_secure: "Store this token securely. You won't be able to see it again.",
    logged_out_success: 'Successfully logged out from your Anthropic account.',
    sorry_cc_error: 'Sorry, Claude Code encountered an error',
    sorry_claude_error: 'Sorry, Claude encountered an error',
    error_edit_file: 'Error editing file',
    error_edit_notebook: 'Error editing notebook',
    error_write_file: 'Error writing file',
    migration_failed: 'Migration failed \u00b7 Run /doctor for details',
    unable_connect: 'Unable to connect to Anthropic services',
    check_connection: 'Check your network connection.',
    this_conversation_diff_dir: 'This conversation is from a different directory.',
    glob_warning: '\u26a0 Warning: Glob patterns not fully supported on Linux',
    bash_sandboxed: 'Your bash commands will be sandboxed. Disable with /sandbox.',
    bypass_responsibility: 'By proceeding, you accept all responsibility for actions taken while running in Bypass Permissions mode.',
    managed_by_org: 'Managed by your organization \u2014 contact your admin',
    connect_remote_claude: 'Connect your local environment for remote-control sessions via claude.ai/code',
    disconnect_remote: 'You can disconnect remote access anytime by running /remote-control again.',
    teleport_requires: 'Teleport requires a Claude account',
    cc_installed_success: 'Claude Code successfully installed!',
    lets_get_started: "Let's get started.",
    nothing_to_rewind: 'Nothing to rewind to yet.',
    code_not_changed: 'The code has not changed (nothing will be restored).',
    code_unchanged: 'The code will be unchanged.',
    conversation_forked: 'The conversation will be forked.',
    conversation_unchanged: 'The conversation will be unchanged.',
    messages_summarized: 'Messages after this point will be summarized.',
    what_like_to_do: 'What would you like to do?',
    select_continue: "Please select how you'd like to continue",
    how_handle: 'How would you like to handle this?',
    would_like_to: 'Would you like to:',
    choose_option: 'Choose an option:',
    effort_high_this_turn: 'Effort set to high for this turn',
  },

  tips: {
    tip_ide: 'Tip: You can enable auto-connect to IDE in /config or with the --ide flag',
    tip_launch: 'Tip: You can launch Claude Code with just `claude`',
    option_enter: 'Press Option+Enter to send a multi-line message',
    shift_enter: 'Press Shift+Enter to send a multi-line message',
    ctrl_c_exit: 'Press Ctrl+C to exit and start a new conversation.',
    ctrl_d_debug: 'Ctrl+d to show debug info',
    ctrl_f_bg: 'Press ctrl+f again to stop background agents',
    option_enter_newline: 'Option+Enter will now enter a newline.',
    shift_enter_newlines: 'Shift+Enter for newlines',
    option_enter_newlines: 'Option+Enter for newlines and visual bell',
    enable_option_enter: 'Enable Option+Enter key binding for newlines and visual bell',
    install_shift_enter: 'Install Shift+Enter key binding for newlines',
    run_terminal_setup_option: 'Run /terminal-setup to enable Option+Enter for new lines',
    run_terminal_setup_shift: 'Run /terminal-setup to enable Shift+Enter for new lines',
    iterm_native: 'Note: iTerm2, WezTerm, Ghostty, Kitty, and Warp support Shift+Enter natively.',
    thinking_ctrl_o: 'Show thinking summaries in the transcript view (ctrl+o). Default: false.',
  },

  commands: {
    help_desc: 'Show help and available commands',
    config_desc: 'Open config panel',
    theme_desc: 'Change the theme',
    rewind_desc: 'Restore the code and/or conversation to a previous point',
    add_dir_desc: 'Add a new working directory',
    agents_desc: 'Manage agent configurations',
    stats_desc: 'Show your Claude Code usage statistics and activity',
    status_desc: 'Show Claude Code status including version, model, account, API connectivity, and tool statuses',
    statusline_desc: "Set up Claude Code's status line UI",
    install_slack_desc: 'Install the Claude Slack app',
    install_github_desc: 'Set up Claude GitHub Actions for a repository',
    skills_desc: 'List available skills',
    simplify_desc: 'Review changed code for reuse, quality, and efficiency, then fix any issues found.',
    stickers_desc: 'Order Claude Code stickers',
    vim_desc: 'Toggle between Vim and Normal editing modes',
    brief_desc: 'Toggle brief-only mode',
    btw_desc: 'Ask a quick side question without interrupting the main conversation',
    clear_desc: 'Clear conversation history and free up context',
    color_desc: 'Set the prompt bar color for this session',
    commit_desc: 'Create a git commit',
    commit_push_pr_desc: 'Commit, push, and open a PR',
    compact_desc: 'Clear conversation history but keep a summary in context. Optional: /compact [instructions for summarization]',
    copy_desc: "Copy Claude's last response to clipboard (or /copy N for the Nth-latest)",
    cost_desc: 'Show the total cost and duration of the current session',
    diff_desc: 'View uncommitted changes and per-turn diffs',
    effort_desc: 'Set effort level for model usage',
    export_desc: 'Export the current conversation to a file or clipboard',
    extra_usage_desc: 'Configure extra usage to keep working when limits are hit',
    feedback_desc: 'Submit feedback about Claude Code',
    files_desc: 'List all files currently in context',
    heapdump_desc: 'Dump the JS heap to ~/Desktop',
    hooks_desc: 'View hook configurations for tool events',
    ide_desc: 'Manage IDE integrations and show status',
    init_verifiers_desc: 'Create verifier skill(s) for automated verification of code changes',
    insights_desc: 'Generate a report analyzing your Claude Code sessions',
    install_desc: 'Install Claude Code native build',
    logout_desc: 'Sign out from your Anthropic account',
    mcp_desc: 'Manage MCP servers',
    memory_desc: 'Edit Claude memory files',
    plan_desc: 'Enable plan mode or view the current session plan',
    passes_desc: 'Manage allow & deny tool permission rules',
    privacy_desc: 'View and update your privacy settings',
    reload_plugins_desc: 'Activate pending plugin changes in the current session',
    rename_desc: 'Rename the current conversation',
    resume_desc: 'Resume a previous conversation',
    upgrade_desc: 'Upgrade to Max for higher rate limits and more Opus',
    usage_desc: 'Show plan usage limits',
    voice_desc: 'Toggle voice mode',
    think_back_desc: 'Your 2025 Claude Code Year in Review',
    thinkback_play_desc: 'Play the thinkback animation',
    review_desc: 'Review a pull request',
    tag_desc: 'Toggle a searchable tag on the current session',
    tasks_desc: 'List and manage background tasks',
    remote_control_desc: 'Connect this terminal for remote-control sessions',
    keybindings_desc: 'Open or create your keybindings configuration file',
    doctor_desc: 'Diagnose and verify your Claude Code installation and settings',
    chrome_desc: 'Claude in Chrome (Beta) settings',
    alias_desc: 'Create or list command aliases',
    plugin_desc: 'Manage Claude Code plugins',
  },

  subcommands: {
    mcp_add_desc: 'Add an MCP server (stdio or SSE) with a JSON string',
    marketplace_add_desc: 'Add a marketplace from a URL, path, or GitHub repo',
    install_check_desc: 'Check for updates and install if available',
    doctor_health_desc: 'Check the health of your Claude Code auto-updater',
    mcp_configure_desc: 'Configure and manage MCP servers',
    remote_configure_desc: 'Configure the default remote environment for teleport sessions',
    plugin_disable_desc: 'Disable an enabled plugin',
    plugin_enable_desc: 'Enable a disabled plugin',
    mcp_get_desc: 'Get details about an MCP server',
    mcp_import_desc: 'Import MCP servers from Claude Desktop (Mac and WSL only)',
    plugin_install_desc: 'Install a plugin from available marketplaces (use plugin@marketplace for specific marketplace)',
    install_native_desc: 'Install Claude Code native build. Use [target] to specify version (stable, latest, or specific version)',
    marketplace_list_desc: 'List all configured marketplaces',
    agents_list_desc: 'List configured agents',
    mcp_list_desc: 'List configured MCP servers',
    plugin_list_desc: 'List installed plugins',
    logout_auth_desc: 'Log out from your Anthropic account',
    auth_manage_desc: 'Manage authentication',
    marketplace_manage_desc: 'Manage Claude Code marketplaces',
    marketplace_remove_desc: 'Remove a configured marketplace',
    mcp_remove_desc: 'Remove an MCP server',
    mcp_reset_desc: 'Reset all approved and rejected project-scoped (.mcp.json) servers within this project',
    auth_token_desc: 'Set up a long-lived authentication token (requires Claude subscription)',
    auth_status_desc: 'Show authentication status',
    login_desc: 'Sign in to your Anthropic account',
    mcp_serve_desc: 'Start the Claude Code MCP server',
    plugin_uninstall_desc: 'Uninstall an installed plugin',
    plugin_update_desc: 'Update a plugin to the latest version (restart required to apply)',
    marketplace_update_desc: 'Update marketplace(s) from their source - updates all if no name specified',
    plugin_validate_desc: 'Validate a plugin or marketplace manifest',
  },

  config: {
    haiku_desc: 'Haiku 4.5 \u00b7 Fastest for quick answers',
    sonnet_desc: 'Sonnet 4.6 \u00b7 Best for everyday tasks',
    opus_legacy_desc: 'Opus 4.1 \u00b7 Legacy',
    most_capable_desc: 'Most capable for complex reasoning tasks',
    fast_efficient_desc: 'Fast and efficient for simple tasks',
    balanced_desc: 'Balanced performance - best for most agents',
    opus_plan_sonnet_desc: 'Use Opus 4.6 in plan mode, Sonnet 4.6 otherwise',
    same_model_desc: 'Use the same model as the main conversation',
    color_theme_desc: 'Color theme for the UI',
    default_perm_desc: 'Default permission mode for tool usage',
    auto_compact_desc: 'Auto-compact when context is full',
    enable_memory_desc: 'Enable auto-memory',
    enable_thinking_desc: 'Enable extended thinking (false to disable)',
    enable_checkpoint_desc: 'Enable file checkpointing for code rewind',
    enable_todo_desc: 'Enable todo/task tracking',
    enable_voice_desc: 'Enable voice dictation (hold-to-talk)',
    enable_debug_desc: 'Enable debug logging for this session and help diagnose issues',
    enable_remote_desc: 'Enable Remote Control for all sessions (true | false | default)',
    no_thinking_desc: 'Claude will respond without extended thinking',
    with_thinking_desc: 'Claude will think before responding',
    key_binding_desc: 'Key binding mode',
    current_model_desc: 'Current model',
    current_model_custom_desc: 'Current model (custom ID)',
    custom_haiku_desc: 'Custom Haiku model',
    custom_opus_desc: 'Custom Opus model',
    custom_sonnet_desc: 'Custom Sonnet model',
    custom_model_desc: 'Custom model',
    permission_levels_desc: 'LOW (safe dev workflows), MEDIUM (recoverable changes), HIGH (dangerous/irreversible)',
    rate_limit_options_desc: 'Show options when rate limit is reached',
    skip_picker_desc: 'Skip this picker in the future (revert via /config)',
  },
};

/**
 * Flatten KNOWN_STRINGS into a list of { key, original, category } entries.
 */
function flattenKnownStrings(): { key: string; original: string; category: string }[] {
  const result: { key: string; original: string; category: string }[] = [];
  for (const [category, strings] of Object.entries(KNOWN_STRINGS)) {
    for (const [key, original] of Object.entries(strings)) {
      result.push({ key: `${category}.${key}`, original, category });
    }
  }
  return result;
}

/**
 * Extract context around a match position in the source.
 */
function getContext(source: string, index: number, length: number, contextSize = 50): string {
  const start = Math.max(0, index - contextSize);
  const end = Math.min(source.length, index + length + contextSize);
  return source.substring(start, end).replace(/\n/g, '\\n');
}

/**
 * Step 1: Find known UI strings by exact match in the cli.js source.
 */
function extractKnownStrings(source: string): ExtractedString[] {
  const results: ExtractedString[] = [];
  const known = flattenKnownStrings();

  for (const { key, original, category } of known) {
    // Search for the string in both quote styles
    for (const quote of ['"', "'"]) {
      const pattern = `${quote}${original}${quote}`;
      const index = source.indexOf(pattern);
      if (index !== -1) {
        results.push({
          key,
          original,
          pattern,
          context: getContext(source, index, pattern.length),
          category,
          confidence: 'high',
        });
        break;
      }
    }

    // Also check without quotes (for JSX text content, template literals)
    if (!results.find(r => r.key === key)) {
      const index = source.indexOf(original);
      if (index !== -1) {
        results.push({
          key,
          original,
          pattern: original,
          context: getContext(source, index, original.length),
          category,
          confidence: 'high',
        });
      }
    }
  }

  return results;
}

/**
 * Step 2: Pattern-match for additional UI strings not in the known list.
 *
 * Looks for quoted strings that appear to be user-facing text:
 * - 3-80 characters
 * - Contains at least one space (phrases, not identifiers)
 * - Starts with uppercase (UI labels typically do)
 * - No URL/path characters
 * - Not all caps (constants)
 */
function extractPatternStrings(source: string, knownOriginals: Set<string>): ExtractedString[] {
  const results: ExtractedString[] = [];
  const seen = new Set<string>();

  // Match strings in createElement text content: ,"text")
  const uiTextPattern = /createElement\([^,]+,(?:\{[^}]*\}|null),\s*"([^"]{3,80})"\s*\)/g;
  let match;
  while ((match = uiTextPattern.exec(source)) !== null) {
    const text = match[1];
    if (isLikelyUIString(text) && !knownOriginals.has(text) && !seen.has(text)) {
      seen.add(text);
      results.push({
        key: `discovered.${toKey(text)}`,
        original: text,
        pattern: match[0].substring(0, 100),
        context: getContext(source, match.index, match[0].length),
        category: 'discovered',
        confidence: 'medium',
      });
    }
  }

  // Match label:"..." patterns (UI labels in component props)
  const labelPattern = /label:\s*"([^"]{3,80})"/g;
  while ((match = labelPattern.exec(source)) !== null) {
    const text = match[1];
    if (isLikelyUIString(text) && !knownOriginals.has(text) && !seen.has(text)) {
      seen.add(text);
      results.push({
        key: `discovered.${toKey(text)}`,
        original: text,
        pattern: match[0],
        context: getContext(source, match.index, match[0].length),
        category: 'discovered',
        confidence: 'medium',
      });
    }
  }

  // Match title:"..." patterns (tab/mode titles)
  const titlePattern = /title:\s*"([^"]{3,60})"/g;
  while ((match = titlePattern.exec(source)) !== null) {
    const text = match[1];
    if (isLikelyUIString(text) && !knownOriginals.has(text) && !seen.has(text)) {
      seen.add(text);
      results.push({
        key: `discovered.${toKey(text)}`,
        original: text,
        pattern: match[0],
        context: getContext(source, match.index, match[0].length),
        category: 'discovered',
        confidence: 'medium',
      });
    }
  }

  // Match placeholder:"..." patterns
  const placeholderPattern = /placeholder:\s*"([^"]{3,80})"/g;
  while ((match = placeholderPattern.exec(source)) !== null) {
    const text = match[1];
    if (isLikelyUIString(text) && !knownOriginals.has(text) && !seen.has(text)) {
      seen.add(text);
      results.push({
        key: `discovered.${toKey(text)}`,
        original: text,
        pattern: match[0],
        context: getContext(source, match.index, match[0].length),
        category: 'discovered',
        confidence: 'medium',
      });
    }
  }

  return results;
}

/**
 * Check if a string looks like user-facing UI text.
 */
function isLikelyUIString(s: string): boolean {
  // Must start with uppercase or emoji
  if (!/^[A-Z\u{1F000}-\u{1FFFF}\u2700-\u27BF\u2600-\u26FF\u2733]/u.test(s)) return false;

  // Must contain a space (phrases, not identifiers)
  if (!s.includes(' ')) return false;

  // Exclude URLs, paths, code-like strings
  if (/^https?:\/\//.test(s)) return false;
  if (s.includes('/') && s.split('/').length > 2) return false;
  if (/^[A-Z_]+$/.test(s)) return false; // ALL_CAPS constant
  if (s.includes('=') && s.includes('(')) return false; // code
  if (s.includes('${') || s.includes('`')) return false; // template literal
  if (/\.[a-z]{2,4}$/.test(s) && !s.endsWith('...') && !s.endsWith('\u2026')) return false; // file extensions

  return true;
}

/**
 * Convert a UI string to a safe key name.
 */
function toKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 40);
}

/**
 * Extract translatable UI strings from Claude Code's cli.js bundle.
 *
 * Two-step approach:
 * 1. Exact match against known UI strings (high confidence)
 * 2. Pattern matching for additional strings (medium confidence)
 *
 * @param cliPath - Path to the cli.js file
 * @returns Array of extracted strings with metadata
 */
export async function extractStrings(cliPath: string): Promise<ExtractedString[]> {
  const source = await fs.readFile(cliPath, 'utf-8');
  return extractStringsFromSource(source);
}

/**
 * Same as extractStrings, for source text that is already in memory
 * (e.g. the JavaScript read out of the native Claude Code binary).
 */
export function extractStringsFromSource(source: string): ExtractedString[] {
  // Step 1: Known strings
  const knownResults = extractKnownStrings(source);

  // Build set of already-found originals for dedup
  const knownOriginals = new Set(knownResults.map(r => r.original));

  // Step 2: Pattern matching
  const patternResults = extractPatternStrings(source, knownOriginals);

  return [...knownResults, ...patternResults];
}

/**
 * Categorize extracted strings by UI area.
 */
export function categorizeStrings(
  strings: ExtractedString[]
): Record<string, ExtractedString[]> {
  const categories: Record<string, ExtractedString[]> = {};
  for (const s of strings) {
    if (!categories[s.category]) {
      categories[s.category] = [];
    }
    categories[s.category].push(s);
  }
  return categories;
}
