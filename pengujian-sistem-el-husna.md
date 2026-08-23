# 5.5. Pengujian Sistem

Pengujian sistem dilakukan untuk memastikan bahwa seluruh fungsi dalam aplikasi **El-Husna Library** berjalan sesuai spesifikasi logika kode (*White Box Testing*) serta membuktikan ketepatan perhitungan algoritma pengelompokan minat baca (*K-Means Clustering*).

---

## 5.5.1. Pengujian White Box

Pengujian *White Box* pada penelitian ini dilakukan menggunakan teknik *Basis Path Testing* untuk menguji alur logika program berdasarkan struktur kontrol (*control flow*) yang terdapat pada sistem. Pengujian dilakukan dengan menghitung nilai *Cyclomatic Complexity* untuk menentukan jumlah jalur independen (*independent path*) yang harus diuji. Setiap jalur independen selanjutnya digunakan sebagai dasar dalam penyusunan skenario pengujian.

### A. Perhitungan *Cyclomatic Complexity*

Perhitungan *Cyclomatic Complexity* dilakukan menggunakan dua pendekatan untuk memastikan hasil perhitungan yang diperoleh konsisten, yaitu berdasarkan jumlah *edge* dan *node*, serta berdasarkan jumlah *predicate node*.

**1. Berdasarkan Jumlah *Edge* dan *Node***

$$V(G) = E - N + 2$$

**Keterangan:**
* $V(G)$ = nilai *Cyclomatic Complexity*.
* $E$ = jumlah *edge* atau garis yang menghubungkan antar-*node*.
* $N$ = jumlah *node* atau simpul pada *flowgraph*.

**2. Berdasarkan Jumlah *Predicate Node***

$$V(G) = P + 1$$

**Keterangan:**
* $V(G)$ = nilai *Cyclomatic Complexity*.
* $P$ = jumlah *predicate node* atau simpul keputusan.

Nilai *Cyclomatic Complexity* yang diperoleh menunjukkan jumlah jalur independen yang harus diuji pada fungsi yang dianalisis.

---

### 5.5.1.1. Pengujian Fungsi Transaksi Peminjaman

Pengujian *White Box* pada penelitian ini difokuskan pada fungsi transaksi peminjaman buku. Fungsi tersebut dipilih karena memiliki beberapa kondisi dan percabangan yang dapat dianalisis menggunakan teknik *Basis Path Testing*. Pengujian dilakukan berdasarkan potongan kode program yang berkaitan dengan proses autentikasi, validasi data peminjaman, pemeriksaan hak akses, pemeriksaan peminjaman aktif, pemeriksaan ketersediaan buku, serta proses penyimpanan transaksi. Blok penanganan exception (`catch`) tidak dimasukkan dalam perhitungan kompleksitas karena pengujian difokuskan pada jalur logika utama yang dirancang dalam fungsi tersebut.

#### A. Potongan Kode

Lokasi file pada sistem: `src/app/api/borrowings/route.ts` (Baris 99 - 175)

```typescript
export async function POST(request: NextRequest) {
  try {
    // [Node 1]: START
    // [Node 2]: Cek session
    const session = await getSession();
    
    // [Node 3]: Session valid?
    if (!session) {
      // [Node 4]: Return Error 401 Unauthorized
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // [Node 5]: Terima request (bookId, borrowDate, dueDate)
    const { bookId, borrowDate, dueDate } = await request.json();

    // [Node 6]: Field wajib kosong?
    if (!bookId || !borrowDate || !dueDate) {
      // [Node 7]: Return Error 400 "Semua field wajib diisi"
      return NextResponse.json(
        { error: "Semua field wajib diisi" },
        { status: 400 }
      );
    }

    // [Node 8]: dueDate <= borrowDate?
    if (new Date(dueDate) <= new Date(borrowDate)) {
      // [Node 9]: Return Error 400 "Tanggal jatuh tempo tidak valid"
      return NextResponse.json(
        { error: "Tanggal jatuh tempo tidak valid" },
        { status: 400 }
      );
    }

    // [Node 10]: Role = MEMBER?
    if (session.role === "MEMBER") {
      // [Node 11]: Hitung peminjaman aktif member
      const activeCount = await db.borrowing.count({
        where: {
          userId: session.userId,
          status: "ACTIVE",
        },
      });

      // [Node 12]: Peminjaman aktif >= 1?
      if (activeCount >= 1) {
        // [Node 13]: Return Error 400 "Masih memiliki peminjaman aktif"
        return NextResponse.json(
          { error: "Anda masih memiliki peminjaman aktif" },
          { status: 400 }
        );
      }
    }

    // [Node 14]: Cari buku di database
    const book = await db.book.findUnique({ where: { id: bookId } });
    
    // [Node 15]: Buku ada & stok > 0?
    if (!book || book.stock <= 0) {
      // [Node 16]: Return Error 400 "Buku tidak tersedia"
      return NextResponse.json(
        { error: "Buku tidak tersedia" },
        { status: 400 }
      );
    }

    // [Node 17]: Buat peminjaman & kurangi stok (transaksi)
    const borrowing = await db.$transaction(async (tx) => {
      const created = await tx.borrowing.create({
        data: {
          userId: session.userId,
          bookId,
          borrowDate: new Date(borrowDate),
          dueDate: new Date(dueDate),
          status: "ACTIVE",
        },
      });

      await tx.book.update({
        where: { id: bookId },
        data: { stock: { decrement: 1 } },
      });

      return created;
    });

    // [Node 18]: Return 201 "Peminjaman berhasil"
    return NextResponse.json({ borrowing }, { status: 201 });
  } catch (error) { ... }
}
```

#### B. Flowchart

```
[MULAI]
   │
[Cek Session Login]
   │
   ├─► (Belum Login / Session Null?) ──(Ya)──► [Return Status 401: Error] ──┐
   │         │                                                              │
   │       (Tidak)                                                          │
   │         │                                                              │
   │   [Terima Request: bookId, borrowDate, dueDate]                        │
   │         │                                                              │
   │   (Parameter Ada Yang Kosong?) ───(Ya)──► [Return Status 400: Error] ──┤
   │         │                                                              │
   │       (Tidak)                                                          │
   │         │                                                              │
   │   (dueDate <= borrowDate?) ───────(Ya)──► [Return Status 400: Error] ──┤
   │         │                                                              │
   │       (Tidak)                                                          │
   │         │                                                              │
   │   (Role User === "MEMBER"?)                                            │
   │     /                  \                                               │
   │   (Ya)               (Tidak)                                           │
   │    │                    │                                              │
   │ [Hitung Pinjaman Aktif]  │                                              │
   │    │                    │                                              │
   │ (Aktif >= 1?) ──(Ya)────┼──────────► [Return Status 400: Error] ──┤
   │    │                    │                                              │
   │  (Tidak)                │                                              │
   │    └─────────┬──────────┘                                              │
   │              │                                                         │
   │   [Query Data Buku & Cek Stok]                                         │
   │              │                                                         │
   │   (Buku Kosong / Stok <= 0?) ─────(Ya)──► [Return Status 400: Error] ──┤
   │              │                                                         │
   │            (Tidak)                                                     │
   │              │                                                         │
   │   [Eksekusi DB Transaksi: Buat Borrowing & Stok Buku -1]              │
   │              │                                                         │
   │   [Return Status 201: Created Peminjaman]                              │
   │              │                                                         │
   └──────────────┴─────────────────────────────────────────────────────────┴─► [SELESAI]
```

#### C. Flowgraph

```
       [1] START
        │
       [2] Cek session login
        │
       <3> Session valid?
      / \
    Tidak Ya
    │      │
   [4]    [5] Terima request (bookId, dates)
  (401)    │
   │      <6> Field wajib kosong?
   │     / \
   │   Ya   Tidak
   │   │      │
   │  [7]    <8> dueDate <= borrowDate?
   │ (400)  / \
   │   │   Ya  Tidak
   │   │   │     │
   │   │  [9]  <10> Role = MEMBER?
   │   │ (400) / \
   │   │   │  Ya   Tidak
   │   │   │  │       \
   │   │   │ [11]      │
   │   │   │  │        │
   │   │   │ <12>      │
   │   │   │ / \       │
   │   │   │Ya  Tdk    │
   │   │   ││    \    /
   │   │   │[13]  [14] Cari buku di database
   │   │   │(400)   │
   │   │   │ │    <15> Buku ada & stok > 0?
   │   │   │ │   / \
   │   │   │ │Tidak Ya
   │   │   │ │ │      │
   │   │   │ │[16]   [17] Buat peminjaman & kurangi stok
   │   │   │ │(400)    │
   │   │   │ │ │     [18] RETURN 201 Peminjaman berhasil
   └───┴───┴─┴−┴──────┴───────► [19] END
```

**Rincian 19 Node (Simpul Process & Decision):**
* **Node 1**: 1. START
* **Node 2**: 2. Cek session
* **Node 3**: 3. Decision: Session valid?
* **Node 4**: 4. RETURN Error 401 "Unauthorized"
* **Node 5**: 5. Terima request (`bookId`, `borrowDate`, `dueDate`)
* **Node 6**: 6. Decision: Field wajib kosong?
* **Node 7**: 7. RETURN Error 400 "Semua field wajib diisi"
* **Node 8**: 8. Decision: `dueDate <= borrowDate`?
* **Node 9**: 9. RETURN Error 400 "Tanggal jatuh tempo tidak valid"
* **Node 10**: 10. Decision: `role === "MEMBER"`?
* **Node 11**: 11. Hitung peminjaman aktif member
* **Node 12**: 12. Decision: Peminjaman aktif $\ge 1$?
* **Node 13**: 13. RETURN Error 400 "Masih memiliki peminjaman aktif"
* **Node 14**: 14. Cari buku di database
* **Node 15**: 15. Decision: Buku ada & stok $> 0$?
* **Node 16**: 16. RETURN Error 400 "Buku tidak tersedia"
* **Node 17**: 17. Buat peminjaman & kurangi stok (transaksi DB)
* **Node 18**: 18. RETURN 201 "Peminjaman berhasil"
* **Node 19**: 19. END (Terminal tunggal)

**Rincian 24 Edge (Alur Transisi):**
`(1-2)`, `(2-3)`, `(3-4)`, `(3-5)`, `(4-19)`, `(5-6)`, `(6-7)`, `(6-8)`, `(7-19)`, `(8-9)`, `(8-10)`, `(9-19)`, `(10-11)`, `(10-14)`, `(11-12)`, `(12-13)`, `(12-14)`, `(13-19)`, `(14-15)`, `(15-16)`, `(15-17)`, `(16-19)`, `(17-18)`, `(18-19)`.

**Simpul Decision / Predicate Node ($P = 6$):**
Node 3, Node 6, Node 8, Node 10, Node 12, Node 15.

#### D. Perhitungan *Cyclomatic Complexity*

**1. Berdasarkan Jumlah Edge ($E$) dan Node ($N$):**
$$V(G) = E - N + 2 = 24 - 19 + 2 = 7$$

**2. Berdasarkan Jumlah Predicate Node ($P$):**
$$V(G) = P + 1 = 6 + 1 = 7$$

Berdasarkan kedua perhitungan tersebut, diperoleh nilai *Cyclomatic Complexity* sebesar **7**, sehingga terdapat **7 jalur independen** yang harus diuji.

#### E. *Independent Path*

* **Path 1**: `1-2-3-4-19` (Kondisi belum login / session null)
* **Path 2**: `1-2-3-5-6-7-19` (Parameter peminjaman kosong)
* **Path 3**: `1-2-3-5-6-8-9-19` (Tanggal jatuh tempo tidak valid)
* **Path 4**: `1-2-3-5-6-8-10-11-12-13-19` (Member masih memiliki peminjaman aktif)
* **Path 5**: `1-2-3-5-6-8-10-14-15-16-19` (Buku tidak tersedia / stok habis)
* **Path 6**: `1-2-3-5-6-8-10-11-12-14-15-17-18-19` (Member berhasil melakukan peminjaman)
* **Path 7**: `1-2-3-5-6-8-10-14-15-17-18-19` (Admin/Petugas berhasil melakukan peminjaman)

#### F. *Test Case*

| No Case | Skenario Pengujian | Input Data | Expected Output | Actual Output | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-B01** | Peminjaman tanpa login | Session $= \text{null}$ | HTTP 401 Unauthorized | HTTP 401 Unauthorized | Pass |
| **TC-B02** | Field buku / tanggal kosong | `bookId: null` | HTTP 400 Bad Request | HTTP 400 Bad Request | Pass |
| **TC-B03** | Tanggal jatuh tempo tidak valid | `dueDate <= borrowDate` | HTTP 400 Bad Request | HTTP 400 Bad Request | Pass |
| **TC-B04** | Member memiliki peminjaman aktif | Session Member (Aktif $= 1$) | HTTP 400 Bad Request | HTTP 400 Bad Request | Pass |
| **TC-B05** | Stok buku 0 (habis) | `bookId` (Stok $= 0$) | HTTP 400 Bad Request | HTTP 400 Bad Request | Pass |
| **TC-B06** | Member berhasil meminjam | Session Member (Aktif $= 0$, Stok $\ge 1$) | HTTP 201 Created | HTTP 201 Created | Pass |
| **TC-B07** | Admin berhasil meminjam | Session Admin (Data Valid) | HTTP 201 Created | HTTP 201 Created | Pass |

#### G. Kesimpulan White Box

Berdasarkan hasil pengujian *White Box* menggunakan teknik *Basis Path Testing* pada fungsi transaksi peminjaman, diperoleh nilai *Cyclomatic Complexity* sebesar 7 yang menunjukkan terdapat 7 jalur independen yang perlu diuji. Seluruh jalur independen yang telah ditentukan selanjutnya digunakan sebagai dasar penyusunan *test case*. Berdasarkan hasil pengujian, jalur yang diuji menghasilkan keluaran sesuai dengan kondisi yang telah ditentukan, sehingga fungsi transaksi peminjaman dapat berjalan sesuai dengan alur logika yang dirancang.

---

## 5.5.2. Pengujian Algoritma K-Means

Pengujian algoritma K-Means dilakukan untuk memverifikasi dan membuktikan ketepatan perhitungan matematik pengelompokan tingkat minat baca anggota pada modul `src/lib/kmeans.ts`. Pengujian dilakukan dengan membandingkan **perhitungan manual langkah demi langkah (*step-by-step mathematical calculation*)** terhadap **output eksekusi otomatis oleh sistem**.

### 1. Definisi Fitur & Parameter Clustering
Aktivitas anggota direpresentasikan ke dalam vektor 3 Dimensi $[X_1, X_2, X_3]$:
1. $X_1$ (`totalBorrow`): Jumlah peminjaman buku fisik.
2. $X_2$ (`totalReturn`): Jumlah pengembalian buku fisik.
3. $X_3$ (`totalEbook`): Akses dan progres *E-Book*.

Parameter Kluster:
* Jumlah Kluster: $K = 3$ (*Tinggi*, *Sedang*, *Rendah*).
* Formula Jarak Euclidean (*Euclidean Distance*):
  $$d(A, B) = \sqrt{(x_{A1} - x_{B1})^2 + (x_{A2} - x_{B2})^2 + (x_{A3} - x_{B3})^2}$$

---

### 2. Dataset Sampel Pengujian
Sebagai sampel pengujian, diambil 6 data aktivitas siswa ($N = 6$):

| Kode | Nama Anggota | $X_1$ (Borrow) | $X_2$ (Return) | $X_3$ (E-Book) | Vektor $[X_1, X_2, X_3]$ | Total Komposit ($X_1+X_2+X_3$) |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| **S1** | Ahmad Hilmi | 1 | 1 | 0 | $[1, 1, 0]$ | 2 |
| **S2** | Budi Santoso | 2 | 1 | 1 | $[2, 1, 1]$ | 4 |
| **S3** | Chika Amelia | 5 | 4 | 3 | $[5, 4, 3]$ | 12 |
| **S4** | Deni Kurniawan | 6 | 5 | 4 | $[6, 5, 4]$ | 15 |
| **S5** | Eka Rahmawati | 10 | 9 | 8 | $[10, 9, 8]$ | 27 |
| **S6** | Fajar Pratama | 12 | 11 | 10 | $[12, 11, 10]$ | 33 |

---

### 3. Inisialisasi Centroid Awal (Sesuai Logika Kode `kmeans.ts`)
Berdasarkan pengurutan nilai total komposit ($X_1 + X_2 + X_3$):
* **Centroid 0 ($C_1$)** [Point Minimum / S1] = $[1, 1, 0]$
* **Centroid 1 ($C_2$)** [Point Middle / S4] = $[6, 5, 4]$
* **Centroid 2 ($C_3$)** [Point Maximum / S6] = $[12, 11, 10]$

---

### 4. Perhitungan Manual Iterasi 1

#### A. Perhitungan Jarak Euclidean ke Centroid Awal
1. **S1 ($[1, 1, 0]$)**:
   * $d(S1, C_1) = \sqrt{(1-1)^2 + (1-1)^2 + (0-0)^2} = \mathbf{0.00}$ (Terdekat ke $C_1$)
   * $d(S1, C_2) = \sqrt{(1-6)^2 + (1-5)^2 + (0-4)^2} = \sqrt{25+16+16} = \sqrt{57} \approx 7.55$
   * $d(S1, C_3) = \sqrt{(1-12)^2 + (1-11)^2 + (0-10)^2} = \sqrt{121+100+100} = \sqrt{321} \approx 17.92$

2. **S2 ($[2, 1, 1]$)**:
   * $d(S2, C_1) = \sqrt{(2-1)^2 + (1-1)^2 + (1-0)^2} = \sqrt{1+0+1} = \sqrt{2} \approx \mathbf{1.41}$ (Terdekat ke $C_1$)
   * $d(S2, C_2) = \sqrt{(2-6)^2 + (1-5)^2 + (1-4)^2} = \sqrt{16+16+9} = \sqrt{41} \approx 6.40$
   * $d(S2, C_3) = \sqrt{(2-12)^2 + (1-11)^2 + (1-10)^2} = \sqrt{100+100+81} = \sqrt{281} \approx 16.76$

3. **S3 ($[5, 4, 3]$)**:
   * $d(S3, C_1) = \sqrt{34} \approx 5.83$
   * $d(S3, C_2) = \sqrt{(5-6)^2 + (4-5)^2 + (3-4)^2} = \sqrt{3} \approx \mathbf{1.73}$ (Terdekat ke $C_2$)
   * $d(S3, C_3) = \sqrt{147} \approx 12.12$

4. **S4 ($[6, 5, 4]$)**:
   * $d(S4, C_1) = \sqrt{57} \approx 7.55$
   * $d(S4, C_2) = \mathbf{0.00}$ (Terdekat ke $C_2$)
   * $d(S4, C_3) = \sqrt{108} \approx 10.39$

5. **S5 ($[10, 9, 8]$)**:
   * $d(S5, C_1) = \sqrt{209} \approx 14.46$
   * $d(S5, C_2) = \sqrt{48} \approx 6.93$
   * $d(S5, C_3) = \sqrt{(10-12)^2 + (9-11)^2 + (8-10)^2} = \sqrt{12} \approx \mathbf{3.46}$ (Terdekat ke $C_3$)

6. **S6 ($[12, 11, 10]$)**:
   * $d(S6, C_1) = \sqrt{321} \approx 17.92$
   * $d(S6, C_2) = \sqrt{108} \approx 10.39$
   * $d(S6, C_3) = \mathbf{0.00}$ (Terdekat ke $C_3$)

#### B. Hasil Alokasi Cluster Iterasi 1
* **Cluster 0**: $\{S1, S2\}$
* **Cluster 1**: $\{S3, S4\}$
* **Cluster 2**: $\{S5, S6\}$

#### C. Pembaruan Centroid Baru ($C'$)
* **$C_1'$** $= \left( \frac{1+2}{2}, \frac{1+1}{2}, \frac{0+1}{2} \right) = [1.50, 1.00, 0.50]$
* **$C_2'$** $= \left( \frac{5+6}{2}, \frac{4+5}{2}, \frac{3+4}{2} \right) = [5.50, 4.50, 3.50]$
* **$C_3'$** $= \left( \frac{10+12}{2}, \frac{9+11}{2}, \frac{8+10}{2} \right) = [11.00, 10.00, 9.00]$

---

### 5. Perhitungan Manual Iterasi 2 & Evaluasi Konvergensi

#### Hasil Jarak dan Alokasi pada Iterasi 2:
| Siswa | Vektor $[X_1, X_2, X_3]$ | $d(S, C_1')$ | $d(S, C_2')$ | $d(S, C_3')$ | Cluster Terdekat | Jarak Minimal |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **S1** | $[1, 1, 0]$ | **0.71** | 6.69 | 16.19 | **Cluster 0** | 0.71 |
| **S2** | $[2, 1, 1]$ | **0.71** | 5.55 | 15.03 | **Cluster 0** | 0.71 |
| **S3** | $[5, 4, 3]$ | 5.24 | **0.87** | 10.39 | **Cluster 1** | 0.87 |
| **S4** | $[6, 5, 4]$ | 6.96 | **0.87** | 8.66 | **Cluster 1** | 0.87 |
| **S5** | $[10, 9, 8]$ | 13.87 | 7.79 | **1.73** | **Cluster 2** | 1.73 |
| **S6** | $[12, 11, 10]$ | 17.34 | 11.26 | **1.73** | **Cluster 2** | 1.73 |

Pada Iterasi 2, anggota kluster **tidak mengalami perubahan** dibanding Iterasi 1. Karena alokasi kluster sudah stabil, proses iterasi dihentikan (**Konvergen pada Iterasi ke-2**).

---

### 6. Pemetaan Label Minat Baca
Berdasarkan nilai rata-rata komposit centroid akhir:
1. Centroid 2 (Nilai $= 30.00$) $\rightarrow$ Label **"Tinggi"**
2. Centroid 1 (Nilai $= 13.50$) $\rightarrow$ Label **"Sedang"**
3. Centroid 0 (Nilai $= 3.00$) $\rightarrow$ Label **"Rendah"**

---

### 7. Perbandingan Hasil Perhitungan Manual vs Output Aplikasi

| Kode | Nama Anggota | Hasil Perhitungan Manual | Hasil Eksekusi System (`kmeans.ts`) | Evaluasi Kesesuaian |
| :---: | :--- | :---: | :---: | :---: |
| **S1** | Ahmad Hilmi | Kluster Rendah | Kluster Rendah | Match |
| **S2** | Budi Santoso | Kluster Rendah | Kluster Rendah | Match |
| **S3** | Chika Amelia | Kluster Sedang | Kluster Sedang | Match |
| **S4** | Deni Kurniawan | Kluster Sedang | Kluster Sedang | Match |
| **S5** | Eka Rahmawati | Kluster Tinggi | Kluster Tinggi | Match |
| **S6** | Fajar Pratama | Kluster Tinggi | Kluster Tinggi | Match |

> **Kesimpulan Pengujian K-Means:** Hasil pengujian membuktikan bahwa perbandingan perhitungan manual secara matematis dengan modul fungsi `executeKMeansClustering()` pada aplikasi El-Husna Library menghasilkan nilai centroid, iterasi konvergensi (2 iterasi), dan pembagian label kelompok minat baca yang **identik/presisi**. Algoritma K-Means dinyatakan valid dan bekerja dengan sangat baik.
