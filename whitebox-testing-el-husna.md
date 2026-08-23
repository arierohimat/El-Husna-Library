# White-Box Testing — Sistem Perpustakaan El-Husna

Dokumen ini berisi pengujian white-box menggunakan metode **Basis Path Testing** untuk fungsi-fungsi utama sistem.

---

## 1. Pengujian Fungsi Login (`POST /api/auth/login`)

### 1.1 Pseudocode / Alur Logika

```
1.  START
2.  Terima request (email, password)
3.  IF (!email || !password)
4.      RETURN error "Email dan password wajib diisi" (400)
5.  IF (password.length < 8)
6.      RETURN error "Password minimal 8 karakter" (400)
7.  Query user dari database (by email/username)
8.  IF (!user)
9.      RETURN error "Email atau password salah" (401)
10. Verifikasi password dengan bcrypt
11. IF (!isValidPassword)
12.     RETURN error "Email atau password salah" (401)
13. Buat session & set cookie
14. RETURN success "Login berhasil" (200)
15. END
```

### 1.2 Flow Graph

```
        [1] START
         |
        [2] Terima request
         |
        <3> email/password kosong?
       / \
     Ya   Tidak
     |      |
    [4]    <5> password < 8?
  (400)   / \
         Ya  Tidak
         |     |
        [6]   [7] Query user
      (400)    |
              <8> user ditemukan?
             / \
           Tdk   Ya
            |     |
           [9]  [10] Verifikasi password
         (401)    |
                <11> password valid?
               / \
             Tdk   Ya
              |     |
            [12]  [13] Buat session
           (401)    |
                  [14] RETURN sukses
                    |
                  [15] END
```

### 1.3 Cyclomatic Complexity

**V(G) = P + 1**  (P = jumlah predikat/decision node)

Decision nodes: 3, 5, 8, 11 → **P = 4**

**V(G) = 4 + 1 = 5**

### 1.4 Basis Path (Independent Paths)

| Path | Jalur | Keterangan |
|------|-------|------------|
| Path 1 | 1-2-3-4 | Email/password kosong |
| Path 2 | 1-2-3-5-6 | Password kurang dari 8 karakter |
| Path 3 | 1-2-3-5-7-8-9 | User tidak ditemukan |
| Path 4 | 1-2-3-5-7-8-10-11-12 | Password salah |
| Path 5 | 1-2-3-5-7-8-10-11-13-14-15 | Login berhasil |

### 1.5 Test Cases

| No | Test Case | Input | Expected Output | Status |
|----|-----------|-------|-----------------|--------|
| TC-L01 | Email kosong | email: "", password: "12345678" | Error 400: "Email dan password wajib diisi" | ✅ Pass |
| TC-L02 | Password kurang dari 8 karakter | email: "admin@test.com", password: "123" | Error 400: "Password minimal 8 karakter" | ✅ Pass |
| TC-L03 | User tidak ditemukan | email: "nobody@test.com", password: "12345678" | Error 401: "Email atau password salah" | ✅ Pass |
| TC-L04 | Password salah | email: "admin@elhusna.sch.id", password: "wrongpass" | Error 401: "Email atau password salah" | ✅ Pass |
| TC-L05 | Login berhasil | email: "admin@elhusna.sch.id", password: "admin123" | 200: "Login berhasil" + session cookie | ✅ Pass |

---

## 2. Pengujian Fungsi Register (`POST /api/auth/register`)

### 2.1 Pseudocode / Alur Logika

```
1.  START
2.  Terima request (email, username, name, kelas, password)
3.  IF (!email || !username || !name || !password)
4.      RETURN error "Semua field wajib diisi" (400)
5.  IF (password.length < 8)
6.      RETURN error "Password minimal 8 karakter" (400)
7.  Query cek duplikat email/username
8.  IF (existingUser)
9.      RETURN error "Email atau username sudah digunakan" (400)
10. Hash password
11. Simpan user baru ke database
12. RETURN success "Registrasi berhasil" (201)
13. END
```

### 2.2 Flow Graph

```
       [1] START
        |
       [2] Terima request
        |
       <3> field kosong?
      / \
    Ya   Tidak
    |      |
   [4]    <5> password < 8?
 (400)   / \
        Ya  Tidak
        |     |
       [6]   [7] Cek duplikat
     (400)    |
             <8> sudah ada?
            / \
          Ya   Tidak
          |     |
         [9]  [10] Hash password
       (400)    |
              [11] Simpan user
                |
              [12] RETURN sukses (201)
                |
              [13] END
```

### 2.3 Cyclomatic Complexity

Decision nodes: 3, 5, 8 → **P = 3**

**V(G) = 3 + 1 = 4**

### 2.4 Basis Path

| Path | Jalur | Keterangan |
|------|-------|------------|
| Path 1 | 1-2-3-4 | Field wajib kosong |
| Path 2 | 1-2-3-5-6 | Password kurang dari 8 karakter |
| Path 3 | 1-2-3-5-7-8-9 | Email/username sudah terdaftar |
| Path 4 | 1-2-3-5-7-8-10-11-12-13 | Registrasi berhasil |

### 2.5 Test Cases

| No | Test Case | Input | Expected Output | Status |
|----|-----------|-------|-----------------|--------|
| TC-R01 | Field kosong | email: "", username: "", name: "", password: "" | Error 400: "Semua field wajib diisi" | ✅ Pass |
| TC-R02 | Password pendek | email: "new@test.com", username: "new", name: "New", password: "123" | Error 400: "Password minimal 8 karakter" | ✅ Pass |
| TC-R03 | Email duplikat | email: "admin@elhusna.sch.id", username: "newuser", name: "New", password: "12345678" | Error 400: "Email atau username sudah digunakan" | ✅ Pass |
| TC-R04 | Registrasi berhasil | email: "baru@test.com", username: "baru", name: "User Baru", password: "12345678" | 201: "Registrasi berhasil" | ✅ Pass |

---

## 3. Pengujian Fungsi Tambah User (`POST /api/users`)

### 3.1 Pseudocode / Alur Logika

```
1.  START
2.  Cek session & role admin
3.  IF (!session || role !== "ADMIN")
4.      RETURN error "Unauthorized" (403)
5.  Terima request body (name, email, username, password, role, kelas)
6.  IF (!name || !email || !username || !password)
7.      RETURN error "Semua field wajib diisi" (400)
8.  IF (password.length < 6)
9.      RETURN error "Password minimal 6 karakter" (400)
10. Cek duplikat email/username
11. IF (existing)
12.     RETURN error "Email atau username sudah digunakan" (400)
13. Hash password & simpan user
14. RETURN user baru (201)
15. END
```

### 3.2 Flow Graph

```
       [1] START
        |
       [2] Cek session
        |
       <3> bukan admin?
      / \
    Ya   Tidak
    |      |
   [4]    [5] Terima body
 (403)     |
          <6> field kosong?
         / \
       Ya   Tidak
       |      |
      [7]    <8> password < 6?
    (400)   / \
           Ya  Tidak
           |     |
          [9]  [10] Cek duplikat
        (400)    |
               <11> sudah ada?
              / \
            Ya   Tidak
            |     |
          [12]  [13] Hash & simpan
        (400)     |
                [14] RETURN (201)
                  |
                [15] END
```

### 3.3 Cyclomatic Complexity

Decision nodes: 3, 6, 8, 11 → **P = 4**

**V(G) = 4 + 1 = 5**

### 3.4 Basis Path

| Path | Jalur | Keterangan |
|------|-------|------------|
| Path 1 | 1-2-3-4 | Bukan admin / tidak login |
| Path 2 | 1-2-3-5-6-7 | Field wajib kosong |
| Path 3 | 1-2-3-5-6-8-9 | Password kurang dari 6 karakter |
| Path 4 | 1-2-3-5-6-8-10-11-12 | Email/username duplikat |
| Path 5 | 1-2-3-5-6-8-10-11-13-14-15 | User berhasil ditambahkan |

### 3.5 Test Cases

| No | Test Case | Input | Expected Output | Status |
|----|-----------|-------|-----------------|--------|
| TC-U01 | Tanpa login | Tidak ada session | Error 403: "Unauthorized" | ✅ Pass |
| TC-U02 | Field kosong | name: "" (session admin) | Error 400: "Semua field wajib diisi" | ✅ Pass |
| TC-U03 | Password pendek | password: "123" (session admin) | Error 400: "Password minimal 6 karakter" | ✅ Pass |
| TC-U04 | Username duplikat | username: "admin" (session admin) | Error 400: "Email atau username sudah digunakan" | ✅ Pass |
| TC-U05 | Berhasil tambah | Data lengkap & valid (session admin) | 201: User baru | ✅ Pass |

---

## 4. Pengujian Fungsi Pinjam Buku (`POST /api/borrowings`)

### 4.1 Pseudocode / Alur Logika

```
1.  START
2.  Cek session
3.  IF (!session)
4.      RETURN error "Unauthorized" (401)
5.  Terima request (bookId, borrowDate, dueDate)
6.  IF (!bookId || !borrowDate || !dueDate)
7.      RETURN error "Semua field wajib diisi" (400)
8.  IF (dueDate <= borrowDate)
9.      RETURN error "Tanggal jatuh tempo tidak valid" (400)
10. IF (role === "MEMBER")
11.     Hitung peminjaman aktif
12.     IF (activeCount >= 1)
13.         RETURN error "masih memiliki peminjaman aktif" (400)
14. Cari buku
15. IF (!book || book.stock <= 0)
16.     RETURN error "Buku tidak tersedia" (400)
17. Buat peminjaman & kurangi stok (transaksi)
18. RETURN borrowing baru (201)
19. END
```

### 4.2 Flow Graph

```
       [1] START
        |
       [2] Cek session
        |
       <3> belum login?
      / \
    Ya   Tidak
    |      |
   [4]    [5] Terima body
 (401)     |
          <6> field kosong?
         / \
       Ya   Tidak
       |      |
      [7]    <8> dueDate <= borrowDate?
    (400)   / \
           Ya  Tidak
           |     |
          [9]  <10> role MEMBER?
        (400)  / \
             Ya   Tidak
             |       \
           [11]       |
             |        |
           <12>       |
           / \        |
         Ya   Tdk     |
         |     \     /
       [13]    [14] Cari buku
     (400)       |
               <15> stok habis?
              / \
            Ya   Tidak
            |      |
          [16]   [17] Simpan peminjaman
        (400)      |
                 [18] RETURN (201)
                   |
                 [19] END
```

### 4.3 Cyclomatic Complexity

Decision nodes: 3, 6, 8, 10, 12, 15 → **P = 6**

**V(G) = 6 + 1 = 7**

### 4.4 Basis Path

| Path | Jalur | Keterangan |
|------|-------|------------|
| Path 1 | 1-2-3-4 | Belum login |
| Path 2 | 1-2-3-5-6-7 | Field kosong |
| Path 3 | 1-2-3-5-6-8-9 | Tanggal tidak valid |
| Path 4 | 1-2-3-5-6-8-10-11-12-13 | Member masih punya peminjaman aktif |
| Path 5 | 1-2-3-5-6-8-10-14-15-16 | Buku tidak tersedia / stok habis |
| Path 6 | 1-2-3-5-6-8-10-11-12-14-15-17-18-19 | Member berhasil pinjam (tidak ada aktif) |
| Path 7 | 1-2-3-5-6-8-10-14-15-17-18-19 | Admin berhasil buat peminjaman |

### 4.5 Test Cases

| No | Test Case | Input | Expected Output | Status |
|----|-----------|-------|-----------------|--------|
| TC-B01 | Tanpa login | Tidak ada session | Error 401: "Unauthorized" | ✅ Pass |
| TC-B02 | Field kosong | bookId: null | Error 400: "Semua field wajib diisi" | ✅ Pass |
| TC-B03 | Tanggal tidak valid | dueDate < borrowDate | Error 400: "Tanggal jatuh tempo tidak valid" | ✅ Pass |
| TC-B04 | Member sudah pinjam | Session member + 1 aktif | Error 400: "Anda masih memiliki peminjaman aktif" | ✅ Pass |
| TC-B05 | Stok buku habis | bookId: (stok 0) | Error 400: "Buku tidak tersedia" | ✅ Pass |
| TC-B06 | Member berhasil pinjam | Session member + data valid + stok ≥1 | 201: Peminjaman berhasil | ✅ Pass |
| TC-B07 | Admin berhasil buat | Session admin + data valid | 201: Peminjaman berhasil | ✅ Pass |

---

## Ringkasan Hasil White-Box Testing

| No | Fungsi | V(G) | Jumlah Path | Test Cases | Hasil |
|----|--------|------|-------------|------------|-------|
| 1 | Login | 5 | 5 | 5 | ✅ Semua Pass |
| 2 | Register | 4 | 4 | 4 | ✅ Semua Pass |
| 3 | Tambah User | 5 | 5 | 5 | ✅ Semua Pass |
| 4 | Pinjam Buku | 7 | 7 | 7 | ✅ Semua Pass |
| **Total** | | **21** | **21** | **21** | **✅ 100% Pass** |

> **Kesimpulan:** Seluruh 21 test case pada 4 fungsi utama sistem telah diuji menggunakan metode basis path testing dan semuanya menghasilkan output sesuai yang diharapkan. Setiap jalur independen (independent path) telah tercover dengan baik.
