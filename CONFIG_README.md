# Configuration Integration Guide

## Overview
ระบบ Configuration ได้รับการปรับปรุงให้ใช้ไฟล์เดียว (`backend/config/config.php`) เป็นหลัก พร้อม backward compatibility สำหรับไฟล์เดิม

## File Structure
```
AI/WebDrivingSimulator/
├── backend/config/
│   ├── config.php          # Main configuration file
│   └── helper.php          # Helper functions
└── config/
    ├── database.php        # Wrapper file (legacy support)
    └── test-config.php     # Testing file
```

## Main Configuration File
**Location**: `backend/config/config.php`

### Key Features:
- ✅ Centralized configuration
- ✅ PHP 5.6+ compatible  
- ✅ Backward compatibility
- ✅ No duplicate constants warnings
- ✅ Legacy constant mapping

### Configuration Sections:
1. **Database Configuration**
   - `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `DB_CHARSET`
   - Legacy: `DB_USER`, `DB_PASS`

2. **Security Configuration**
   - `CSRF_TOKEN_LIFETIME`, `SESSION_TIMEOUT`, `JWT_SECRET`
   - Legacy: `SESSION_LIFETIME`

3. **Rate Limiting**
   - `RATE_LIMIT_GENERAL`, `RATE_LIMIT_CSRF`, `RATE_LIMIT_LOGIN`

4. **File Upload**
   - `MAX_FILE_SIZE`, `ALLOWED_FILE_TYPES`, `UPLOAD_PATH`

5. **Application Settings**
   - `APP_NAME`, `APP_VERSION`, `DEBUG_MODE`
   - Legacy: `APP_DEBUG`

6. **Evaluation Thresholds**
   - `SPEED_LIMIT_CITY`, `SPEED_LIMIT_HIGHWAY`
   - `OVERSPEED_THRESHOLD`, `SUDDEN_BRAKE_THRESHOLD`

## Usage Examples

### Basic Usage
```php
// Include main config
require_once 'backend/config/config.php';

// Use constants directly
$host = DB_HOST;
$debug = DEBUG_MODE;
```

### Using Helper Functions
```php
// Include helper
require_once 'backend/config/helper.php';

// Get database config as array
$dbConfig = getDatabaseConfig();

// Get app information
$appInfo = getAppInfo();

// Check file type
if (isAllowedFileType('jpg')) {
    // File type allowed
}
```

### Legacy Support
```php
// Old code still works
require_once 'config/database.php';

$user = DB_USER;        // Maps to DB_USERNAME
$pass = DB_PASS;        // Maps to DB_PASSWORD
$debug = APP_DEBUG;     // Maps to DEBUG_MODE
```

## Migration Guide

### From Old Config
Old code using `config/database.php` continues to work without changes.

### New Code
For new code, use the main config:
```php
// New recommended way
require_once 'backend/config/config.php';
$username = DB_USERNAME;  // Use new constants
$debug = DEBUG_MODE;      // Use new constants
```

## Testing
Run the test file to verify configuration:
```
http://localhost/enomban/AI/WebDrivingSimulator/config/test-config.php
```

## Benefits
1. **Single Source of Truth** - All configuration in one file
2. **No Duplicate Warnings** - Smart constant checking
3. **Backward Compatible** - Legacy code continues to work
4. **Helper Functions** - Easy access to configuration arrays
5. **PHP 5.6 Compatible** - No modern PHP features required

## Troubleshooting

### Constants Already Defined
If you see "Constant already defined" warnings:
1. Check if multiple config files are being included
2. Ensure proper `if (!defined())` checks
3. Use the main `config.php` file only

### File Not Found
If config file not found:
1. Check file paths
2. Ensure proper directory structure
3. Use the wrapper `database.php` for automatic path resolution

## Future Enhancements
- Environment-specific configurations
- Configuration caching
- Runtime configuration updates
- Configuration validation