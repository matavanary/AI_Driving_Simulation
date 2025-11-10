# 🚗 Driving Behavior Simulation and Evaluation System

**เวอร์ชัน:** 1.0  
**วันที่:** 30 ตุลาคม 2568  
**ผู้พัฒนา:** Mr.Nattakit Rookkason  

---

## 📋 คำอธิบาย

ระบบจำลองการขับรถและประเมินพฤติกรรม (Driving Behavior Simulation and Evaluation System) เป็น Web Application ที่ใช้เทคโนโลยี 3D สำหรับจำลองการขับรถแบบเสมือนจริง พร้อมระบบประเมินพฤติกรรมการขับรถแบบเรียลไทม์

### ✨ คุณสมบัติหลัก

- 🌍 **จำลอง 3D แบบเสมือนจริง** - ใช้ Three.js สร้างสภาพแวดล้อมการขับรถที่สมจริง
- 🎮 **รองรับอุปกรณ์หลากหลาย** - Logitech G29/G923, Gamepad ทั่วไป และ Keyboard
- 📊 **ประเมินพฤติกรรมเรียลไทม์** - วิเคราะห์การขับรถและให้คะแนนทันที
- 🌦️ **สภาพแวดล้อมหลากหลาย** - เมือง, ทางด่วน, กลางคืน, ฝนตก
- 📈 **รายงานและสถิติ** - กราฟแสดงผล, รายงาน PDF และการส่งออกข้อมูล
- 🏆 **ระบบให้คะแนน** - เกรด A+ ถึง F พร้อมคำแนะนำเพื่อการปรับปรุง

---

## 🛠️ ความต้องการของระบบ

### Server Requirements
- **PHP:** 5.6 หรือใหม่กว่า (รองรับ PDO)
- **Web Server:** Apache หรือ Nginx
- **Database:** MySQL 5.7+ หรือ MSSQL Server 2016+
- **Memory:** อย่างน้อย 512 MB RAM
- **Storage:** อย่างน้อย 100 MB พื้นที่ว่าง

### Client Requirements
- **Browser:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **JavaScript:** เปิดใช้งาน JavaScript
- **WebGL:** รองรับ WebGL 2.0
- **Gamepad API:** สำหรับใช้งาน Logitech G29 (ไม่บังคับ)

---

## 📦 การติดตั้ง

### ขั้นตอนที่ 1: เตรียมไฟล์

1. Clone หรือ download โปรเจคจาก GitHub:
```bash
git clone https://github.com/matavanary/AI_Driving_Simulation.git
cd AI_Driving_Simulation
```

2. อัพโหลดไฟล์ทั้งหมดไปยัง web server ของคุณ

### ขั้นตอนที่ 2: ตั้งค่าฐานข้อมูล

1. สร้างฐานข้อมูลใหม่:
```sql
CREATE DATABASE driving_simulation 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. นำเข้าโครงสร้างฐานข้อมูล:
```bash
mysql -u username -p driving_simulation < database/schema.sql
```

### ขั้นตอนที่ 3: กำหนดค่าการเชื่อมต่อ

แก้ไขไฟล์ `config/database.php`:
```php
<?php
define('DB_HOST', 'localhost');
define('DB_NAME', 'driving_simulation');
define('DB_USER', 'your_username');
define('DB_PASS', 'your_password');
define('DB_CHARSET', 'utf8mb4');

// Security
define('JWT_SECRET', 'your-secret-key-change-this');
?>
```

### ขั้นตอนที่ 4: ตั้งค่า Web Server

#### สำหรับ Apache (.htaccess)
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^api/(.*)$ backend/api/$1 [L,QSA]

# Security headers
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection "1; mode=block"
```

#### สำหรับ Nginx
```nginx
location /api/ {
    try_files $uri $uri/ /backend/api/$1;
}

location ~ \.php$ {
    fastcgi_pass unix:/var/run/php/php7.4-fpm.sock;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    include fastcgi_params;
}
```

### ขั้นตอนที่ 5: ตั้งค่าสิทธิ์ไฟล์

```bash
# ให้สิทธิ์การเขียนไฟล์ (ถ้าจำเป็น)
chmod 755 backend/
chmod 644 backend/api/*.php
chmod 644 config/*.php

# ตั้งค่าเจ้าของไฟล์
chown -R www-data:www-data /path/to/project/
```

---

## 🚀 การใช้งาน

### 1. เข้าสู่ระบบครั้งแรก

1. เปิดเว็บเบราว์เซอร์และไปที่ URL ของโปรเจค
2. คลิก "สมัครสมาชิก" เพื่อสร้างบัญชีใหม่
3. กรอกข้อมูลที่จำเป็น และคลิก "สมัครสมาชิก"
4. เข้าสู่ระบบด้วยบัญชีที่สร้างขึ้น

### 2. การใช้งานจำลองการขับรถ

1. คลิค "เริ่มจำลองการขับ" หรือไปที่หน้า Simulator
2. เลือกสภาพแวดล้อมที่ต้องการ (เมือง, ทางด่วน, กลางคืน, ฝนตก)
3. เลือกประเภทรถและอุปกรณ์ควบคุม
4. คลิค "เริ่มการขับ" เพื่อเริ่มเซสชัน
5. ใช้งานตามการควบคุมที่กำหนด:
   - **W** = เร่ง
   - **S** = เบรก
   - **A** = เลี้ยวซ้าย
   - **D** = เลี้ยวขวา
   - **Space** = เบรกมือ
   - **R** = รีเซ็ตตำแหน่ง

### 3. การดูผลการประเมิน

1. ไปที่หน้า Dashboard
2. ดูสถิติรวมและแนวโน้มการปรับปรุง
3. คลิกที่เซสชันในตารางเพื่อดูรายละเอียด
4. ดาวน์โหลดรายงาน PDF หากต้องการ

---

## 🎮 การเชื่อมต่อ Logitech G29

### Windows
1. ติดตั้ง Logitech G HUB software
2. เชื่อมต่อ G29 ผ่าน USB
3. เปิดเว็บเบราว์เซอร์ (แนะนำ Chrome)
4. อนุญาตการเข้าถึง Gamepad เมื่อเว็บไฮต์ถาม

### macOS
1. เชื่อมต่อ G29 ผ่าน USB
2. ไม่จำเป็นต้องติดตั้ง driver เพิ่มเติม
3. เปิดเว็บเบราว์เซอร์และทดสอบการเชื่อมต่อ

### Linux
1. เชื่อมต่อ G29 ผ่าน USB
2. ตรวจสอบการรองรับผ่าน `lsusb`
3. อาจจำเป็นต้องติดตั้ง additional drivers

---

## 🔧 การแก้ไขปัญหา

### ปัญหาที่พบบ่อย

#### 1. ไม่สามารถเชื่อมต่อฐานข้อมูลได้
```
Error: Database connection failed
```
**วิธีแก้:**
- ตรวจสอบข้อมูลการเชื่อมต่อใน `config/database.php`
- ตรวจสอบว่าฐานข้อมูลทำงานอยู่
- ตรวจสอบสิทธิ์การเข้าถึงฐานข้อมูล

#### 2. การจำลอง 3D ไม่แสดงผล
```
WebGL context lost
```
**วิธีแก้:**
- อัพเดทไดรฟ์เวอร์การ์ดจอ
- เปิดใช้งาน Hardware Acceleration ในเบราว์เซอร์
- ลองใช้เบราว์เซอร์อื่น

#### 3. Gamepad ไม่ทำงาน
**วิธีแก้:**
- ตรวจสอบการเชื่อมต่อ USB
- ทดสอบ gamepad ในเกมอื่น
- ใช้เบราว์เซอร์ที่รองรับ Gamepad API

#### 4. ข้อผิดพลาด PHP
```
Fatal error: Call to undefined function
```
**วิธีแก้:**
- ตรวจสอบเวอร์ชัน PHP (ต้อง 5.6+)
- เปิดใช้งาน PDO extension
- ตรวจสอบ error log ของ web server

### การ Debug

เปิดใช้งาน debug mode ใน `config/database.php`:
```php
define('APP_DEBUG', true);
```

ตรวจสอบ Console ในเบราว์เซอร์สำหรับ error messages

---

## 📊 การจัดการข้อมูล

### การสำรองข้อมูล

```bash
# สำรองฐานข้อมูล
mysqldump -u username -p driving_simulation > backup_$(date +%Y%m%d).sql

# สำรองไฟล์โปรเจค
tar -czf driving_sim_backup_$(date +%Y%m%d).tar.gz /path/to/project/
```

### การทำความสะอาดข้อมูล

```sql
-- ลบข้อมูลเก่าที่เกิน 1 ปี
DELETE FROM driving_logs 
WHERE timestamp < DATE_SUB(NOW(), INTERVAL 1 YEAR);

-- ลบ session ที่ไม่สมบูรณ์
DELETE FROM sessions 
WHERE status = 'active' AND start_time < DATE_SUB(NOW(), INTERVAL 1 HOUR);

-- อัพเดท statistics
OPTIMIZE TABLE driving_logs;
OPTIMIZE TABLE sessions;
OPTIMIZE TABLE evaluations;
```

---

## 🔐 ความปลอดภัย

### การตั้งค่าความปลอดภัย

1. **เปลี่ยน JWT Secret Key:**
```php
// config/database.php
define('JWT_SECRET', 'your-super-secret-key-change-this-in-production');
```

2. **ตั้งค่า HTTPS:**
```apache
# .htaccess
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

3. **จำกัดการเข้าถึงไฟล์สำคัญ:**
```apache
<Files "config/database.php">
    Order allow,deny
    Deny from all
</Files>

<Files "*.log">
    Order allow,deny
    Deny from all
</Files>
```

### การอัพเดทความปลอดภัย

- อัพเดท PHP เป็นเวอร์ชันล่าสุดเป็นประจำ
- ตรวจสอบ SQL Injection ด้วย prepared statements
- ใช้ CSRF tokens สำหรับ forms ทั้งหมด
- กำหนด rate limiting สำหรับ API calls

---

## 🎯 การปรับแต่งและการขยาย

### การเพิ่มสภาพแวดล้อมใหม่

1. เพิ่มใน database:
```sql
ALTER TABLE sessions 
MODIFY environment_type ENUM('city', 'highway', 'night', 'rain', 'snow', 'desert');
```

2. อัพเดท JavaScript:
```javascript
// frontend/js/simulation.js
setEnvironment(environment) {
    switch (environment) {
        case 'snow':
            this.sunLight.intensity = 0.7;
            this.scene.background = new THREE.Color(0xf0f8ff);
            // เพิ่มเอฟเฟกต์หิมะ
            break;
        // ... cases อื่นๆ
    }
}
```

### การเพิ่มประเภทรถใหม่

1. อัพเดท HTML select:
```html
<select id="vehicle-select">
    <option value="sedan">รถเก๋ง</option>
    <option value="suv">รถ SUV</option>
    <option value="truck">รถกระบะ</option>
    <option value="motorcycle">รถจักรยานยนต์</option>
    <option value="bus">รถบัส</option>
</select>
```

2. สร้างโมเดล 3D ใหม่:
```javascript
// frontend/js/simulation.js
createVehicleModel(vehicleType) {
    switch(vehicleType) {
        case 'bus':
            return this.createBusModel();
        case 'motorcycle':
            return this.createMotorcycleModel();
        // ... cases อื่นๆ
    }
}
```

---

## 📈 การตรวจสอบประสิทธิภาพ

### การ Monitor ระบบ

1. **Database Performance:**
```sql
-- ตรวจสอบ slow queries
SHOW PROCESSLIST;

-- ดูสถิติ table
SHOW TABLE STATUS LIKE 'driving_logs';

-- วิเคราะห์ query performance
EXPLAIN SELECT * FROM driving_logs WHERE session_id = 1;
```

2. **Web Server Performance:**
```bash
# ตรวจสอบ Apache status
sudo systemctl status apache2

# ดู error logs
tail -f /var/log/apache2/error.log

# ตรวจสอบ memory usage
free -h
```

### การ Optimize

1. **Database Optimization:**
```sql
-- เพิ่ม indexes สำหรับ query ที่ใช้บ่อย
CREATE INDEX idx_user_sessions_date ON sessions(user_id, start_time);
CREATE INDEX idx_logs_session_timestamp ON driving_logs(session_id, timestamp);

-- Partitioning สำหรับข้อมูลจำนวนมาก
ALTER TABLE driving_logs 
PARTITION BY RANGE (YEAR(timestamp)) (
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p2026 VALUES LESS THAN (2027)
);
```

2. **Frontend Optimization:**
```javascript
// ใช้ LOD (Level of Detail) สำหรับ 3D objects
const lodGeometry = new THREE.LOD();
lodGeometry.addLevel(highDetailMesh, 0);
lodGeometry.addLevel(mediumDetailMesh, 50);
lodGeometry.addLevel(lowDetailMesh, 200);
```

---

## 🧪 การทดสอบ

### Unit Testing (PHP)

```php
// tests/UserTest.php
class UserTest extends PHPUnit\Framework\TestCase {
    public function testUserRegistration() {
        $user = new User();
        $result = $user->register('testuser', 'test@example.com', 'password123', 'Test User');
        $this->assertTrue($result['success']);
    }
    
    public function testUserLogin() {
        $user = new User();
        $result = $user->login('testuser', 'password123');
        $this->assertTrue($result['success']);
    }
}
```

### Integration Testing (JavaScript)

```javascript
// tests/simulation.test.js
describe('Simulation Engine', () => {
    let simulation;
    
    beforeEach(() => {
        const canvas = document.createElement('canvas');
        simulation = new SimulationEngine(canvas);
    });
    
    test('should initialize properly', () => {
        expect(simulation.scene).toBeDefined();
        expect(simulation.camera).toBeDefined();
        expect(simulation.renderer).toBeDefined();
    });
    
    test('should handle input correctly', () => {
        const input = { steering: 0.5, throttle: 0.8, brake: 0 };
        simulation.updateInput(input);
        expect(simulation.inputState.steering).toBe(0.5);
    });
});
```

### Load Testing

```bash
# ใช้ Apache Bench สำหรับ load testing
ab -n 1000 -c 10 http://localhost/backend/api/auth.php?action=check-session

# ใช้ Artillery สำหรับ API testing
artillery quick --count 10 --num 100 http://localhost/backend/api/
```

---

## 📱 การรองรับ Mobile

### Responsive Design

```css
/* frontend/css/mobile.css */
@media (max-width: 768px) {
    .simulator-container {
        grid-template-columns: 1fr;
        grid-template-rows: auto 1fr auto;
    }
    
    .simulation-container {
        height: 60vh;
        min-height: 400px;
    }
    
    .hud-overlay {
        padding: 0.5rem;
    }
    
    .speedometer {
        width: 60px;
        height: 60px;
    }
}
```

### Touch Controls

```javascript
// frontend/js/touch-controls.js
class TouchControls {
    constructor() {
        this.setupTouchEvents();
    }
    
    setupTouchEvents() {
        const canvas = document.getElementById('three-canvas');
        
        canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.startTouch = { x: touch.clientX, y: touch.clientY };
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        if (!this.startTouch) return;
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - this.startTouch.x;
        const deltaY = touch.clientY - this.startTouch.y;
        
        // Convert to steering and throttle
        const steering = Math.max(-1, Math.min(1, deltaX / 100));
        const throttle = Math.max(0, Math.min(1, -deltaY / 100));
        
        // Send to simulation
        if (window.simulator) {
            window.simulator.simulation.updateInput({
                steering: steering,
                throttle: throttle,
                brake: 0
            });
        }
    }
}
```

---

## 🔄 การอัพเดท

### Version Control

```bash
# สร้าง git repository
git init
git add .
git commit -m "Initial commit - Driving Simulation v1.0"

# การอัพเดทเวอร์ชันใหม่
git tag v1.1
git push origin v1.1
```

### Database Migration

```php
// migrations/v1_1_add_weather_table.php
<?php
class Migration_v1_1 {
    public function up() {
        $sql = "
        CREATE TABLE weather_conditions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(50) NOT NULL,
            visibility_factor FLOAT DEFAULT 1.0,
            friction_factor FLOAT DEFAULT 1.0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )";
        
        // Execute migration
        return $this->db->query($sql);
    }
    
    public function down() {
        return $this->db->query("DROP TABLE IF EXISTS weather_conditions");
    }
}
?>
```

---

## 🎓 การฝึกอบรม

### คู่มือผู้ใช้

1. **สำหรับผู้เรียนขับรถ:**
   - การใช้งานพื้นฐาน
   - การตีความผลคะแนน
   - เทคนิคการปรับปรุงการขับรถ

2. **สำหรับผู้สอน:**
   - การดู reports และ analytics
   - การตั้งค่า scenarios
   - การประเมินผลผู้เรียน

3. **สำหรับ Administrator:**
   - การจัดการระบบ
   - การสำรองข้อมูล
   - การแก้ไขปัญหา

### Video Tutorials

สร้าง video tutorials สำหรับ:
- การติดตั้งระบบ
- การใช้งาน Logitech G29
- การอ่านและตีความ reports
- การแก้ไขปัญหาเบื้องต้น

---

## 🤝 การสนับสนุน

### Community Support

- **GitHub Issues:** รายงาน bugs และขอ features ใหม่
- **Documentation:** อัพเดท wiki และ documentation
- **Translations:** แปลภาษาเพิ่มเติม

### Commercial Support

สำหรับการสนับสนุนแบบเชิงพาณิชย์:
- ติดตั้งและตั้งค่าระบบ
- การปรับแต่งเฉพาะองค์กร
- การฝึกอบรมทีมงาน
- การบำรุงรักษาระบบ

---

## 📄 License และ Copyright

```
MIT License

Copyright (c) 2025 Mr.Nattakit Rookkason

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 📞 การติดต่อ

**ผู้พัฒนา:** Mr.Nattakit Rookkason  
**GitHub:** [@matavanary](https://github.com/matavanary)  
**Repository:** [AI_Driving_Simulation](https://github.com/matavanary/AI_Driving_Simulation)  
**วันที่อัพเดทล่าสุด:** 30 ตุลาคม 2568  

---

## 🎉 ขอบคุณ

ขอบคุณทุกคนที่มีส่วนร่วมในการพัฒนาโปรเจคนี้:
- Three.js Community สำหรับ 3D engine ที่ยอดเยี่ยม
- Chart.js สำหรับระบบกราฟที่สวยงาม
- PHP Community สำหรับ documentation ที่ครบถ้วน
- ผู้ทดสอบทุกท่านที่ให้ feedback มีค่า

**Happy Driving! 🚗💨**