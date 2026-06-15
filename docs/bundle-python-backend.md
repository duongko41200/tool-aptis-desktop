# Bundle Python Backend with Tauri App

Kế hoạch này trình bày các bước chi tiết để đóng gói (bundle) backend Python bằng PyInstaller và nhúng nó vào ứng dụng Tauri dưới dạng một "Sidecar". Nhờ đó, người dùng cuối không cần cài đặt Python hay chạy riêng backend; backend sẽ tự động khởi động cùng ứng dụng.

## User Review Required

> [!WARNING]
> Việc đóng gói Python (PyInstaller) kết hợp với các thư viện AI như `langchain` hoặc `chromadb` thường khiến file `.exe` trở nên khá nặng (khoảng vài trăm MB). Bạn cần lưu ý điều này về dung lượng của file cài đặt cuối cùng.
> 
> Để quá trình build mượt mà hơn, chúng ta sẽ cần tạo một script phụ (ví dụ `build-backend.py` hoặc `.spec`) giúp PyInstaller gom đủ các thư viện ngầm (hidden imports).

## Open Questions

> [!IMPORTANT]
> 1. **Môi trường Cross-platform**: Bạn muốn build cho cả Windows và MacOS đúng không? Lưu ý rằng file `.exe` chỉ chạy trên Windows. Để có file sidecar trên Mac, bạn sẽ phải chạy lệnh build PyInstaller trên máy Mac. Hiện tại chúng ta sẽ tập trung cấu hình cho Windows trước nhé?
> 2. **Kiểm soát cổng (Port)**: Hiện tại backend chạy ở cổng `8080`. Bạn có muốn cấu hình để Tauri truyền ngẫu nhiên một cổng động (dynamic port) cho backend khi khởi chạy nhằm tránh xung đột với các ứng dụng khác đang dùng cổng `8080` không?

## Proposed Changes

---

### Backend (Python Packaging)
Sử dụng PyInstaller để tạo file thực thi độc lập.

#### [NEW] `backend/backend.spec`
- Tạo file cấu hình PyInstaller.
- Cấu hình các `hiddenimports` cần thiết cho FastAPI, Uvicorn, LangChain, và ChromaDB.
- Tạo lệnh npm script `"build:backend": "pyinstaller backend.spec"` trong `package.json`.

---

### Tauri Configuration
Cấu hình Tauri để nhận diện và nhúng backend như một sidecar.

#### [MODIFY] `src-tauri/tauri.conf.json`
- Thêm thuộc tính `"bundle": { "externalBin": ["binaries/aptis-backend"] }`.
- Tauri sẽ tự động tìm các file `aptis-backend-x86_64-pc-windows-msvc.exe` trong thư mục `src-tauri/binaries/`.

#### [MODIFY] `src-tauri/Cargo.toml`
- Thêm dependency `tauri-plugin-shell` để cho phép khởi chạy file thực thi bên ngoài.

#### [MODIFY] `src-tauri/capabilities/default.json`
- Thêm quyền `shell:default` và cấu hình cho phép thực thi sidecar `aptis-backend`.

#### [MODIFY] `package.json`
- Cài đặt thêm package `@tauri-apps/plugin-shell` vào `dependencies`.

---

### Frontend Integration
Cấu hình Frontend React (TypeScript) để gọi và quản lý tiến trình backend.

#### [MODIFY] `src/App.tsx` (hoặc tạo Service mới)
- Import `Command` từ `@tauri-apps/plugin-shell`.
- Thêm logic `useEffect` để kích hoạt `Command.sidecar('binaries/aptis-backend')` khi app khởi động.
- Lắng nghe event và log lỗi từ quá trình khởi chạy backend để dễ dàng debug.

## Verification Plan

### Automated Tests
- Chạy thử lệnh build cục bộ: `npm run build:backend` để kiểm tra file `.exe` có được sinh ra chuẩn không.
- Chạy `npm run app` (chế độ dev của Tauri) để xem frontend có spawn được tiến trình backend lên và gọi thành công API `/ping` hoặc `/health` hay không.

### Manual Verification
- Bạn (USER) tiến hành build bản chính thức (`npm run build:win`).
- Cài đặt thử file `msi` hoặc `.exe` trên máy để xem backend có chạy ngầm và hoạt động chuẩn hay không.

## Tối Ưu Dung Lượng Bản Build (Ép Cân)

Mặc định, PyInstaller sẽ đóng gói toàn bộ các thư viện hiện có trong môi trường, khiến file sinh ra có thể nặng lên tới ~500MB do các thư viện LangChain và ChromaDB thường kéo theo các thư viện khoa học dữ liệu khổng lồ. 

Để giảm thiểu dung lượng bản cài đặt (có thể xuống **100MB - 150MB**), cần thực hiện các kỹ thuật tối ưu sau:

### 1. Nén bằng công cụ UPX
Tải công cụ [UPX (Ultimate Packer for eXecutables)](https://upx.github.io/) cho Windows, giải nén và đặt file `upx.exe` vào cùng thư mục `backend/`. 
Cấu hình tùy chọn `upx=True` trong file `.spec`. UPX sẽ tự động nén toàn bộ mã nhị phân (`.dll`, `.exe`), giúp giảm **30% - 50%** dung lượng mà không ảnh hưởng tới quá trình vận hành.

### 2. Chặn các thư viện rác (Excludes)
Khai báo mảng `excludes` trong file cấu hình `.spec` để ngăn chặn PyInstaller đóng gói các thư viện siêu nặng nhưng không dùng tới như `pandas`, `numpy`, `scipy`, `matplotlib`.

### 3. Có nên gỡ Ollama để nhẹ hơn không?
* **Với file cài đặt (App Bundle):** Gỡ `langchain-ollama` KHÔNG làm file `.exe` nhẹ đi đáng kể vì thư viện kết nối API này chỉ chiếm vài trăm KB.
* **Với người dùng (Disk Space):** Nếu quyết định loại bỏ hoàn toàn tính năng Local AI (Ollama) và chuyển sang dùng 100% Cloud API (OpenAI, Gemini), **người dùng sẽ tiết kiệm được nhiều GB ổ cứng** do không phải tải các model AI như LLaMA3 hay Qwen về máy. Tuy nhiên, đánh đổi là App bắt buộc phải có kết nối mạng Internet.

---

### Mẫu File `backend.spec` Đã Tối Ưu

Sử dụng mẫu file sau để áp dụng đồng thời các kỹ thuật ép cân. Mở terminal tại thư mục `backend` và chạy lệnh: `pyinstaller --clean aptis-backend-x86_64-pc-windows-msvc.spec`

```python
# -*- mode: python ; coding: utf-8 -*-

import sys
# Tăng giới hạn đệ quy để tránh lỗi khi quét LangChain / ChromaDB
sys.setrecursionlimit(5000)

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=[
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan.on',
        'langchain',
        'langchain_core',
        'langchain_community',
        'chromadb',
        'chromadb.db.impl.sqlite',
        'fastapi',
        'pydantic'
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    # 👇 ĐÂY LÀ PHẦN ÉP CÂN: Chặn các thư viện siêu nặng
    excludes=[
        'pandas', 
        'numpy', 
        'scipy', 
        'matplotlib', 
        'PyQt5', 
        'PySide2', 
        'tkinter', 
        'IPython', 
        'notebook',
        'jedi',
        'debugpy'
    ],
    noarchive=False,
    optimize=2, # Tối ưu hóa bytecode
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='aptis-backend-x86_64-pc-windows-msvc',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    # 👇 BẬT UPX LÊN ĐỂ NÉN MÃ NHỊ PHÂN
    upx=True, 
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True, # Đổi thành False nếu không muốn hiện cửa sổ đen CMD
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
```
