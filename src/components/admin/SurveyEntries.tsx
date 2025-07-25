
"use client"

import { useEffect, useState, useMemo } from "react"
import { collection, getDocs, query, orderBy, Timestamp, doc, deleteDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import Image from "next/image"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Trash2, Eye, Search, FileDown, CheckCircle2, XCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { PaginationControls } from "./PaginationControls"

interface SurveyData {
    id: string;
    informasiHaji: { [key: string]: number };
    rekomendasiPaspor: { [key: string]: number };
    biovisa?: { [key: string]: number };
    penjemputanKoper?: { [key: string]: number };
    mobilisasi?: { [key: string]: number };
    createdAt: Timestamp;
    nama?: string;
    nomorHp?: string;
    pekerjaan: string;
    usia: string;
    jenisKelamin: string;
    pendidikan: string;
    tidakDiarahkan: boolean;
    perbaikan: string[];
    saranInformasiHaji?: string;
    saranRekomendasiPaspor?: string;
    saranBiovisa?: string;
    saranPenjemputanKoper?: string;
    saranMobilisasi?: string;
    tandaTangan: string;
}

const DEFAULT_QUESTIONS = {
    informasiHaji: {
        q1: 'Saya memahami urutan tahapan haji dalam negeri (administrasi, manasik, keberangkatan, dll) dengan jelas.',
        q2: 'Penjelasan mengenai tahapan haji disampaikan secara rinci dan terstruktur.',
        q3: 'Informasi tahapan haji disampaikan dengan bahasa yang mudah dimengerti.',
        q4: 'Informasi mengenai tahapan haji mudah diakses melalui berbagai media (cetak, digital, bimbingan).',
        q5: 'Petugas atau narasumber memberikan informasi yang cukup dan akurat terkait setiap tahapan.',
        q6: 'Informasi setiap tahapan disampaikan sesuai waktu yang dibutuhkan (tidak terlambat/tidak terlalu dini).',
        q7: 'Perubahan jadwal atau prosedur disampaikan dengan segera dan jelas.',
        q8: 'Media penyampaian informasi (aplikasi, media sosial, leaflet, bimbingan manasik) sangat membantu memahami tahapan.',
        q9: 'Bimbingan manasik efektif dalam menjelaskan setiap tahapan haji yang harus dijalani.',
        q10: 'Secara keseluruhan, saya puas terhadap penyampaian informasi mengenai tahapan haji dalam negeri.',
    },
    rekomendasiPaspor: {
        rp1: 'Seberapa puas Anda terhadap kejelasan informasi yang diberikan terkait proses penerbitan rekomendasi paspor?',
        rp2: 'Seberapa mudah proses pengajuan rekomendasi paspor yang Anda alami?',
        rp3: 'Seberapa cepat proses penerbitan rekomendasi paspor setelah Anda mengajukan permohonan?',
        rp4: 'Seberapa puas Anda terhadap sikap dan pelayanan petugas dalam proses penerbitan rekomendasi paspor?',
        rp5: 'Seberapa efektif komunikasi yang Anda terima terkait status permohonan rekomendasi paspor Anda?',
        rp6: 'Secara keseluruhan, seberapa puas Anda terhadap layanan penerbitan rekomendasi paspor?',
    },
    biovisa: {
        bv1: 'Seberapa jelas informasi yang Anda terima terkait proses perekaman sidik jari untuk biovisa?',
        bv2: 'Seberapa mudah proses pendaftaran atau antrean perekaman sidik jari?',
        bv3: 'Seberapa puas Anda terhadap fasilitas atau kenyamanan tempat perekaman sidik jari?',
        bv4: 'Seberapa profesional dan ramah petugas yang melayani perekaman sidik jari?',
        bv5: 'Seberapa puas Anda terhadap komunikasi atau notifikasi jadwal perekaman sidik jari?',
        bv6: 'Seberapa puas Anda terhadap keseluruhan layanan perekaman sidik jari untuk keperluan biovisa?',
    },
    penjemputanKoper: {
        pk1: 'Seberapa puas Anda terhadap ketepatan waktu penjemputan dan penyerahan koper jemaah?',
        pk2: 'Seberapa puas Anda terhadap kejelasan informasi mengenai jadwal dan lokasi penjemputan dan penyerahan koper?',
        pk3: 'Seberapa puas Anda terhadap kemudahan proses penyerahan koper kepada petugas?',
        pk4: 'Seberapa puas Anda terhadap sikap dan pelayanan petugas saat penjemputan dan penyerahan koper?',
        pk5: 'Seberapa puas Anda terhadap koordinasi antara petugas dan jemaah dalam proses penjemputan dan penyerahan koper?',
        pk6: 'Seberapa puas Anda secara keseluruhan terhadap layanan penjemputan dan penyerahan koper?',
    },
    mobilisasi: {
        mh1: "Seberapa puas Anda terhadap kejelasan informasi jadwal keberangkatan dan rute perjalanan?",
        mh2: "Seberapa puas Anda terhadap jumlah armada yang disediakan sesuai kebutuhan jumlah jemaah?",
        mh3: "Seberapa puas Anda terhadap keteraturan dan koordinasi saat proses naik-turun kendaraan?",
        mh4: "Seberapa puas Anda terhadap bantuan petugas selama proses mobilisasi jemaah?",
        mh5: "Seberapa puas Anda secara keseluruhan terhadap pelayanan mobilisasi dari Masjid Jami' ke Asrama Haji?"
    },
    perbaikan: {
        informasi: "Penyampaian Informasi Tahapan Haji",
        paspor: "Penerbitan Rekomendasi Paspor",
        biovisa: "Perekaman Sidik Jari untuk Biovisa",
        koper: "Pelayanan Penjemputan dan Penyerahan Koper",
        mobilisasi: "Mobilisasi ke Asrama Haji",
        tidak_ada: "Tidak ada yang perlu diperbaiki"
    }
};

const KUALITAS_RATINGS: { [key: number]: string } = { 1: "Sangat Tidak Setuju", 2: "Tidak Setuju", 3: "Netral", 4: "Setuju", 5: "Sangat Setuju" };
const KEPUASAN_RATINGS: { [key: number]: string } = { 1: "Sangat Tidak Puas", 2: "Tidak Puas", 3: "Cukup Puas", 4: "Puas", 5: "Sangat Puas" };

export default function SurveyEntries() {
    const [surveys, setSurveys] = useState<SurveyData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
    const [questionConfig, setQuestionConfig] = useState<any>(null);
    const { toast } = useToast();
    
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        const fetchAndProcessData = async () => {
            setLoading(true);
            try {
                // Fetch Config
                const configRef = doc(db, "config", "questions");
                const configSnap = await getDoc(configRef);
                let effectiveConfig = DEFAULT_QUESTIONS;
                if (configSnap.exists()) {
                    const dbConfig = configSnap.data();
                     const perbaikanOptions = (dbConfig.perbaikan && dbConfig.perbaikan.kebijakan)
                        ? DEFAULT_QUESTIONS.perbaikan
                        : { ...DEFAULT_QUESTIONS.perbaikan, ...(dbConfig.perbaikan || {}) };

                     effectiveConfig = {
                        informasiHaji: { ...DEFAULT_QUESTIONS.informasiHaji, ...(dbConfig.informasiHaji || {}) },
                        rekomendasiPaspor: { ...DEFAULT_QUESTIONS.rekomendasiPaspor, ...(dbConfig.rekomendasiPaspor || {}) },
                        biovisa: { ...DEFAULT_QUESTIONS.biovisa, ...(dbConfig.biovisa || {}) },
                        penjemputanKoper: { ...DEFAULT_QUESTIONS.penjemputanKoper, ...(dbConfig.penjemputanKoper || {}) },
                        mobilisasi: { ...DEFAULT_QUESTIONS.mobilisasi, ...(dbConfig.mobilisasi || {}) },
                        perbaikan: perbaikanOptions,
                    };
                }
                setQuestionConfig(effectiveConfig);

                // Fetch Survey Data
                const q = query(collection(db, "surveys"), orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);
                const surveyData: SurveyData[] = [];
                querySnapshot.forEach((doc) => {
                    surveyData.push({ id: doc.id, ...doc.data() } as SurveyData);
                });
                setSurveys(surveyData);
            } catch (err: any) {
                console.error("Error fetching data: ", err);
                if (err.code === 'permission-denied') {
                    toast({
                        variant: "destructive",
                        title: "Izin Ditolak Firestore",
                        description: "Aturan keamanan Anda tidak mengizinkan untuk membaca data survei.",
                    });
                } else {
                    toast({
                        variant: "destructive",
                        title: "Gagal memuat data",
                        description: "Terjadi kesalahan saat mengambil data survei.",
                    });
                }
            } finally {
                setLoading(false);
            }
        };

        fetchAndProcessData();
    }, [toast]);
    
    const handleDelete = async (surveyId: string) => {
        try {
            await deleteDoc(doc(db, "surveys", surveyId));
            setSurveys(surveys.filter(s => s.id !== surveyId));
            toast({
                title: "Data berhasil dihapus",
                description: `Data survei dengan ID ${surveyId} telah dihapus.`,
            });
        } catch (err: any) {
            console.error("Error deleting document: ", err);
             if (err.code === 'permission-denied') {
                toast({
                    variant: "destructive",
                    title: "Izin Ditolak Firestore",
                    description: "Aturan keamanan Anda tidak mengizinkan untuk menghapus data.",
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Gagal menghapus data",
                    description: "Terjadi kesalahan. Mohon coba lagi.",
                });
            }
        }
    };

    const calculateScores = (survey: SurveyData) => {
        if (!questionConfig) return { iih: 0, ikp: 0, ibv: 0, ipk: 0, imh: 0 };

        const calculateIndex = (surveySection: { [key: string]: number } | undefined, configSection: { [key: string]: any } | undefined) => {
            if (!surveySection || !configSection || Object.keys(configSection).length === 0 || Object.keys(surveySection).length === 0) return 0;
            const sum = Object.values(surveySection).reduce((a, b) => a + b, 0);
            const count = Object.keys(configSection).length;
            const maxScore = count * 5;
            if (maxScore === 0) return 0;
            return (sum / maxScore) * 100;
        };

        const iih = calculateIndex(survey.informasiHaji, questionConfig.informasiHaji);
        const ikp = calculateIndex(survey.rekomendasiPaspor, questionConfig.rekomendasiPaspor);
        const ibv = calculateIndex(survey.biovisa, questionConfig.biovisa);
        const ipk = calculateIndex(survey.penjemputanKoper, questionConfig.penjemputanKoper);
        const imh = calculateIndex(survey.mobilisasi, questionConfig.mobilisasi);

        return { iih, ikp, ibv, ipk, imh };
    };

    const sortedAndFilteredSurveys = useMemo(() => {
        if (!questionConfig) return [];
        let filtered = surveys.filter(survey =>
            (survey.nama || "Anonim").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (survey.nomorHp || "").includes(searchTerm)
        );

        filtered.sort((a, b) => {
            let valA, valB;
            const key = sortConfig.key;

            if (['iih', 'ikp', 'ibv', 'ipk', 'imh'].includes(key)) {
                valA = calculateScores(a)[key as keyof ReturnType<typeof calculateScores>];
                valB = calculateScores(b)[key as keyof ReturnType<typeof calculateScores>];
            } else if (key === 'createdAt') {
                valA = a.createdAt.toMillis();
                valB = b.createdAt.toMillis();
            } else { // Handles nama, pekerjaan, usia, jenisKelamin, pendidikan
                valA = (a[key as keyof SurveyData] as string)?.toLowerCase() || '';
                valB = (b[key as keyof SurveyData] as string)?.toLowerCase() || '';
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [surveys, searchTerm, sortConfig, questionConfig]);
    
    const paginatedSurveys = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedAndFilteredSurveys.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedAndFilteredSurveys, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedAndFilteredSurveys.length / itemsPerPage);

    const handleDownload = () => {
        if (sortedAndFilteredSurveys.length === 0 || !questionConfig) {
            toast({ title: "Tidak ada data untuk diunduh." });
            return;
        }

        const flattenedData = sortedAndFilteredSurveys.map(s => {
            const { iih, ikp, ibv, ipk, imh } = calculateScores(s);
            const flat: {[key: string]: any} = {
                id: s.id,
                'Tanggal Input': s.createdAt.toDate().toISOString(),
                'Nama': s.nama || 'Anonim',
                'No. HP': s.nomorHp || '',
                'Pekerjaan': s.pekerjaan,
                'Usia': s.usia,
                'Jenis Kelamin': s.jenisKelamin,
                'Pendidikan': s.pendidikan,
                ...(s.informasiHaji && questionConfig?.informasiHaji ? Object.fromEntries(Object.entries(s.informasiHaji).map(([k,v]) => [`Informasi Haji: ${questionConfig?.informasiHaji?.[k] || k} (Skor)`,v])) : {}),
                'IIH': iih.toFixed(2),
                 'Saran Informasi Haji': s.saranInformasiHaji || '',
                ...(s.rekomendasiPaspor && questionConfig?.rekomendasiPaspor ? Object.fromEntries(Object.entries(s.rekomendasiPaspor).map(([k,v]) => [`Rekomendasi Paspor: ${questionConfig?.rekomendasiPaspor?.[k] || k} (Skor)`,v])) : {}),
                'IKP': ikp.toFixed(2),
                'Saran Rekomendasi Paspor': s.saranRekomendasiPaspor || '',
                ...(s.biovisa && questionConfig?.biovisa ? Object.fromEntries(Object.entries(s.biovisa).map(([k,v]) => [`Biovisa: ${questionConfig?.biovisa?.[k] || k} (Skor)`,v])) : {}),
                'IBV': ibv.toFixed(2),
                'Saran Biovisa': s.saranBiovisa || '',
                ...(s.penjemputanKoper && questionConfig?.penjemputanKoper ? Object.fromEntries(Object.entries(s.penjemputanKoper).map(([k,v]) => [`Penjemputan Koper: ${questionConfig?.penjemputanKoper?.[k] || k} (Skor)`,v])) : {}),
                'IPK': ipk.toFixed(2),
                'Saran Penjemputan Koper': s.saranPenjemputanKoper || '',
                ...(s.mobilisasi && questionConfig?.mobilisasi ? Object.fromEntries(Object.entries(s.mobilisasi).map(([k,v]) => [`Mobilisasi: ${questionConfig?.mobilisasi?.[k] || k} (Skor)`,v])) : {}),
                'IMH': imh.toFixed(2),
                'Saran Mobilisasi': s.saranMobilisasi || '',
                'Pernyataan Mandiri': s.tidakDiarahkan ? 'Ya' : 'Tidak',
                'Area Perbaikan': s.perbaikan.map(p => (questionConfig.perbaikan as any)?.[p] || p).join('; '),
            };
            return flat;
        });

        const headers = Object.keys(flattenedData[0]);
        const csvRows = [headers.join(',')];

        for (const row of flattenedData) {
            const values = headers.map(header => {
                const value = row[header];
                const stringValue = value === null || value === undefined ? '' : String(value);
                const escaped = stringValue.replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        }

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'Laporan-Survey-Kepuasan-Haji-Admin.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return <div className="flex h-full justify-center items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <p className="ml-4">Memuat data survei...</p></div>;
    }

    const DetailAnswerSection = ({ title, surveySection, configSection, saran, ratingLabels }: { title: string, surveySection: { [key: string]: number } | undefined, configSection: any, saran?: string, ratingLabels: { [key: number]: string } }) => {
        if (!surveySection || !configSection || Object.keys(surveySection).length === 0) return null;
        return (
            <div className="space-y-2">
                <h4 className="font-bold text-lg text-primary border-b pb-2">{title}</h4>
                <div className="space-y-2 pt-2">
                    {Object.entries(surveySection).map(([key, value]) => (
                        <div key={key} className="text-sm p-3 bg-secondary/30 rounded-md">
                            <p className="font-normal text-muted-foreground">{configSection?.[key] || `Pertanyaan ID: ${key}`}</p>
                            <div className="flex items-baseline gap-2 mt-1">
                                <p className="font-semibold text-xl text-primary">{value}</p>
                                <p className="font-medium text-primary/90">{ratingLabels[value] || ''}</p>
                            </div>
                        </div>
                    ))}
                </div>
                {saran !== undefined && (
                    <div>
                        <p className="font-medium mt-4">Saran:</p>
                        <blockquote className="border-l-2 pl-4 italic text-muted-foreground mt-1">
                            {saran || "Tidak ada saran."}
                        </blockquote>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="font-headline text-4xl sm:text-5xl font-bold text-primary">
                        Entri Survei
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Manajemen semua data survei kepuasan pelayanan haji.
                    </p>
                </div>
            </header>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <CardTitle>Daftar Responden</CardTitle>
                             <CardDescription>Ditemukan {sortedAndFilteredSurveys.length} dari {surveys.length} total entri.</CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Cari nama atau HP..."
                                    className="pl-8 sm:w-auto md:w-[250px]"
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                />
                            </div>
                            <Select 
                                value={`${sortConfig.key}-${sortConfig.direction}`} 
                                onValueChange={(value) => {
                                    const [key, direction] = value.split('-');
                                    setSortConfig({ key, direction });
                                }}
                            >
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder="Urutkan berdasarkan" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Waktu</SelectLabel>
                                        <SelectItem value="createdAt-desc">Terbaru</SelectItem>
                                        <SelectItem value="createdAt-asc">Terlama</SelectItem>
                                    </SelectGroup>
                                    <SelectGroup>
                                        <SelectLabel>Responden</SelectLabel>
                                        <SelectItem value="nama-asc">Nama (A-Z)</SelectItem>
                                        <SelectItem value="nama-desc">Nama (Z-A)</SelectItem>
                                        <SelectItem value="pekerjaan-asc">Pekerjaan (A-Z)</SelectItem>
                                        <SelectItem value="pekerjaan-desc">Pekerjaan (Z-A)</SelectItem>
                                        <SelectItem value="usia-asc">Usia (A-Z)</SelectItem>
                                        <SelectItem value="usia-desc">Usia (Z-A)</SelectItem>
                                        <SelectItem value="jenisKelamin-asc">Gender (A-Z)</SelectItem>
                                        <SelectItem value="jenisKelamin-desc">Gender (Z-A)</SelectItem>
                                        <SelectItem value="pendidikan-asc">Pendidikan (A-Z)</SelectItem>
                                        <SelectItem value="pendidikan-desc">Pendidikan (Z-A)</SelectItem>
                                    </SelectGroup>
                                    <SelectGroup>
                                        <SelectLabel>Skor Indeks</SelectLabel>
                                        <SelectItem value="iih-desc">IIH Tertinggi</SelectItem>
                                        <SelectItem value="iih-asc">IIH Terendah</SelectItem>
                                        <SelectItem value="ikp-desc">IKP Tertinggi</SelectItem>
                                        <SelectItem value="ikp-asc">IKP Terendah</SelectItem>
                                        <SelectItem value="ibv-desc">IBV Tertinggi</SelectItem>
                                        <SelectItem value="ibv-asc">IBV Terendah</SelectItem>
                                        <SelectItem value="ipk-desc">IPK Tertinggi</SelectItem>
                                        <SelectItem value="ipk-asc">IPK Terendah</SelectItem>
                                        <SelectItem value="imh-desc">IMH Tertinggi</SelectItem>
                                        <SelectItem value="imh-asc">IMH Terendah</SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            <Button onClick={handleDownload} className="w-full sm:w-auto">
                                <FileDown className="mr-2 h-4 w-4" />
                                Unduh CSV
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {surveys.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Belum ada data survei yang masuk.</p>
                    ) : paginatedSurveys.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Tidak ada data yang cocok dengan pencarian Anda.</p>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Responden</TableHead>
                                        <TableHead>Tanggal</TableHead>
                                        <TableHead>Pekerjaan</TableHead>
                                        <TableHead>Usia</TableHead>
                                        <TableHead>Gender</TableHead>
                                        <TableHead>Pendidikan</TableHead>
                                        <TableHead>IIH</TableHead>
                                        <TableHead>IKP</TableHead>
                                        <TableHead>IBV</TableHead>
                                        <TableHead>IPK</TableHead>
                                        <TableHead>IMH</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedSurveys.map(survey => {
                                        const { iih, ikp, ibv, ipk, imh } = calculateScores(survey);
                                        return (
                                        <TableRow key={survey.id}>
                                            <TableCell>
                                                <div className="font-medium">{survey.nama || 'Anonim'}</div>
                                                <div className="text-sm text-muted-foreground">{survey.nomorHp || "Tidak diisi"}</div>
                                            </TableCell>
                                            <TableCell>{survey.createdAt.toDate().toLocaleString('id-ID')}</TableCell>
                                            <TableCell>{survey.pekerjaan}</TableCell>
                                            <TableCell>{survey.usia}</TableCell>
                                            <TableCell>{survey.jenisKelamin}</TableCell>
                                            <TableCell>{survey.pendidikan}</TableCell>
                                            <TableCell>{iih.toFixed(2)}</TableCell>
                                            <TableCell>{ikp.toFixed(2)}</TableCell>
                                            <TableCell>{ibv.toFixed(2)}</TableCell>
                                            <TableCell>{ipk.toFixed(2)}</TableCell>
                                            <TableCell>{imh.toFixed(2)}</TableCell>
                                            <TableCell>
                                                <div className="flex justify-end gap-2">
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button variant="outline" size="icon" className="h-8 w-8">
                                                                <Eye className="h-4 w-4" />
                                                                <span className="sr-only">Lihat Detail</span>
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                                                            <DialogHeader>
                                                                <DialogTitle>Detail Survei - {survey.nama || 'Anonim'}</DialogTitle>
                                                                <DialogDescription>
                                                                    Dikirim pada {survey.createdAt.toDate().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <div className="space-y-8 py-4">
                                                                <div className="space-y-2">
                                                                    <h4 className="font-bold text-lg text-primary border-b pb-2">I. Detail Responden</h4>
                                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm pt-2">
                                                                        <p><strong>Nama:</strong> {survey.nama || "Tidak diisi"}</p>
                                                                        <p><strong>No. HP:</strong> {survey.nomorHp || "Tidak diisi"}</p>
                                                                        <p><strong>Pekerjaan:</strong> {survey.pekerjaan}</p>
                                                                        <p><strong>Usia:</strong> {survey.usia}</p>
                                                                        <p><strong>Jenis Kelamin:</strong> {survey.jenisKelamin}</p>
                                                                        <p><strong>Pendidikan:</strong> {survey.pendidikan}</p>
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="font-bold text-lg text-primary border-b pb-2 mt-6">Tanda Tangan</h4>
                                                                        {survey.tandaTangan ? (
                                                                            <Image src={survey.tandaTangan} alt="Tanda Tangan Responden" width={200} height={100} className="rounded-md border bg-white mt-2" />
                                                                        ) : <p className="text-sm text-muted-foreground mt-2">Tidak ada tanda tangan.</p>}
                                                                    </div>
                                                                </div>

                                                                <DetailAnswerSection title="II. Jawaban Informasi Haji" surveySection={survey.informasiHaji} configSection={questionConfig?.informasiHaji} saran={survey.saranInformasiHaji} ratingLabels={KUALITAS_RATINGS} />
                                                                <DetailAnswerSection title="III. Jawaban Rekomendasi Paspor" surveySection={survey.rekomendasiPaspor} configSection={questionConfig?.rekomendasiPaspor} saran={survey.saranRekomendasiPaspor} ratingLabels={KEPUASAN_RATINGS} />
                                                                <DetailAnswerSection title="IV. Jawaban Biovisa" surveySection={survey.biovisa} configSection={questionConfig?.biovisa} saran={survey.saranBiovisa} ratingLabels={KEPUASAN_RATINGS} />
                                                                <DetailAnswerSection title="V. Jawaban Penjemputan Koper" surveySection={survey.penjemputanKoper} configSection={questionConfig?.penjemputanKoper} saran={survey.saranPenjemputanKoper} ratingLabels={KEPUASAN_RATINGS} />
                                                                <DetailAnswerSection title="VI. Jawaban Mobilisasi" surveySection={survey.mobilisasi} configSection={questionConfig?.mobilisasi} saran={survey.saranMobilisasi} ratingLabels={KEPUASAN_RATINGS} />

                                                                <div className="space-y-2">
                                                                    <h4 className="font-bold text-lg text-primary border-b pb-2">VII. Evaluasi & Verifikasi</h4>
                                                                    <div className="space-y-2 pt-2 text-sm">
                                                                        <p><strong>Area Perbaikan:</strong> {survey.perbaikan.map(p => (questionConfig?.perbaikan as any)?.[p] || p).join(', ')}</p>
                                                                        <div className="flex items-center gap-2">
                                                                            <p><strong>Pernyataan mandiri:</strong></p>
                                                                            {survey.tidakDiarahkan ? (
                                                                                <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                                                                                    <CheckCircle2 className="h-4 w-4" /> Disetujui
                                                                                </span>
                                                                            ) : (
                                                                                <span className="inline-flex items-center gap-1 text-destructive font-medium">
                                                                                    <XCircle className="h-4 w-4" /> Tidak disetujui
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="destructive" size="icon" className="h-8 w-8">
                                                                <Trash2 className="h-4 w-4" />
                                                                <span className="sr-only">Hapus Entri</span>
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Tindakan ini tidak dapat diurungkan. Ini akan menghapus data survei secara permanen dari server.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDelete(survey.id)}>Ya, Hapus</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                    <PaginationControls 
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        itemsPerPage={itemsPerPage}
                        onItemsPerPageChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1); }}
                        totalEntries={sortedAndFilteredSurveys.length}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
