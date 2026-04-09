
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchRequestHistory } from '@/utils/requestHistoryUtils';
import { checkAndMarkExpiredPreApprovals } from '@/utils/preApprovalUtils';
import { get, ref } from 'firebase/database';
import { database } from '@/config/firebase';
import { maskPhoneNumberForDisplay } from '@/utils/phoneFormatting';
import OwnerDashboardHeader from '@/components/OwnerDashboardHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, ChevronLeft, ChevronRight, ArrowUpDown, History, ArrowLeft, Calendar, FileText, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const LOCKBOX_ID = "SmartLock_123";
const ITEMS_PER_PAGE = 10;

const RequestHistory = () => {
  const navigate = useNavigate();
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await checkAndMarkExpiredPreApprovals(LOCKBOX_ID);
        
        // Fetch standard request history
        const requestsData = await fetchRequestHistory(LOCKBOX_ID);
        
        // Fetch audit logs for expired pre-approvals
        const auditLogsRef = ref(database, `lockboxes/${LOCKBOX_ID}/auditLogs`);
        const snapshot = await get(auditLogsRef);
        const auditLogsData = [];
        
        if (snapshot.exists()) {
          const logs = snapshot.val();
          Object.entries(logs).forEach(([id, log]) => {
            if (log.type === 'pre_approval_expired') {
              auditLogsData.push({
                id,
                name: log.guestName || 'Unknown',
                phone: log.guestPhone || '',
                maskedPhone: maskPhoneNumberForDisplay(log.guestPhone || ''),
                type: 'Pre-Approval Expired',
                timestamp: log.expiredAt || Date.now(),
                duration: parseInt(log.duration || 0, 10) * 60, // Convert minutes to seconds for consistency
                status: 'EXPIRED',
                statusPriority: log.expiredAt || Date.now()
              });
            }
          });
        }

        const combinedData = [...requestsData, ...auditLogsData];
        const enhancedData = combinedData.map(item => ({ 
          ...item, 
          statusPriority: item.status === 'KEY_NOT_RETURNED' ? 99 : item.timestamp 
        }));
        
        setRawData(enhancedData);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const processedData = useMemo(() => {
    let filtered = [...rawData];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(i => i.name.toLowerCase().includes(q) || (i.phone && i.phone.includes(q)));
    }
    if (statusFilter !== 'ALL') filtered = filtered.filter(i => i.status === statusFilter);
    if (typeFilter !== 'ALL') {
      if (typeFilter === 'PRE_APPROVED') {
        filtered = filtered.filter(i => i.type === 'Pre-Approved' || i.type === 'Pre-Approval Expired');
      } else {
        filtered = filtered.filter(i => i.type === 'Normal');
      }
    }
    if (dateRange.start) filtered = filtered.filter(i => i.timestamp >= new Date(dateRange.start).getTime());
    if (dateRange.end) {
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(i => i.timestamp <= end.getTime());
    }

    filtered.sort((a, b) => {
      let vA = a[sortConfig.key], vB = b[sortConfig.key];
      if (typeof vA === 'string') vA = vA.toLowerCase();
      if (typeof vB === 'string') vB = vB.toLowerCase();
      if (vA < vB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (vA > vB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [rawData, searchQuery, statusFilter, typeFilter, dateRange, sortConfig]);

  const totalPages = Math.ceil(processedData.length / ITEMS_PER_PAGE);
  const paginatedData = processedData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSort = (key) => setSortConfig(c => ({ key, direction: c.key === key && c.direction === 'asc' ? 'desc' : 'asc' }));

  const formatApprovedDuration = (seconds) => {
    if (seconds === undefined || seconds === null || isNaN(seconds)) return "0";
    if (seconds > 0 && seconds < 60) return "1";
    const minutes = Math.round(seconds / 60);
    return `${minutes}`;
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      <Helmet><title>Audit Logs - SmartLock</title></Helmet>
      <OwnerDashboardHeader lockboxState={null} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
             <Button variant="ghost" onClick={() => navigate('/owner-dashboard')} className="mb-4 text-muted-foreground hover:text-foreground pl-0 -ml-2">
                <ArrowLeft className="w-5 h-5 mr-2" /> Back to Dashboard
             </Button>
            <h1 className="text-3xl font-bold text-foreground font-poppins mb-2">Audit Logs</h1>
            <p className="text-muted-foreground font-medium">Complete history of all device interactions and access requests.</p>
          </div>
          <Badge className="bg-teal-50 text-teal-700 border-teal-200 px-4 py-2 text-sm self-start md:self-auto shadow-sm">
            Total Records: {processedData.length}
          </Badge>
        </div>

        <Card className="p-5 border border-border shadow-md rounded-2xl bg-card">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-teal-500 transition-colors" />
              <Input placeholder="Search user or phone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-11 py-5 rounded-xl border-2 focus:border-teal-500 shadow-sm" />
            </div>

            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <select className="w-full pl-11 pr-4 py-2.5 h-full rounded-xl border-2 border-input bg-background text-foreground font-medium focus:border-teal-500 focus:outline-none appearance-none shadow-sm cursor-pointer" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="ALL">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="APPROVED">Approved Active</option>
                <option value="KEY_NOT_RETURNED">Alert: Missing Key</option>
                <option value="EXPIRED">Expired</option>
                <option value="REJECTED">Rejected</option>
                <option value="CLOSED_BY_OWNER">Closed by Owner</option>
              </select>
            </div>

            <div className="relative">
              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <select className="w-full pl-11 pr-4 py-2.5 h-full rounded-xl border-2 border-input bg-background text-foreground font-medium focus:border-teal-500 focus:outline-none appearance-none shadow-sm cursor-pointer" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="ALL">All Sources</option>
                <option value="PRE_APPROVED">Pre-Approved/Expired</option>
                <option value="NORMAL">Standard Request</option>
              </select>
            </div>

            <div className="relative group">
               <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-teal-500 transition-colors" />
               <Input type="date" value={dateRange.start} onChange={(e) => setDateRange(p => ({ ...p, start: e.target.value }))} className="pl-11 py-5 rounded-xl border-2 focus:border-teal-500 shadow-sm text-sm" />
            </div>
          </div>
        </Card>

        <Card className="border border-border shadow-xl rounded-2xl overflow-hidden bg-card">
          {loading ? (
            <div className="p-16 text-center">
              <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground font-bold font-poppins">Loading Secure Logs...</p>
            </div>
          ) : processedData.length === 0 ? (
            <div className="p-16 text-center bg-muted/30">
              <History className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-foreground font-poppins">No Records Found</h3>
              <p className="text-muted-foreground mt-2 mb-6">Try adjusting your filters to see more results.</p>
              <Button onClick={() => {setSearchQuery(''); setStatusFilter('ALL'); setTypeFilter('ALL'); setDateRange({start:'', end:''});}} variant="outline" className="border-2 rounded-xl font-bold">Clear Filters</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50 border-b border-border">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="py-4 cursor-pointer hover:text-teal-600 transition-colors font-bold text-foreground" onClick={() => handleSort('name')}><div className="flex items-center gap-2">User <ArrowUpDown className="w-3 h-3" /></div></TableHead>
                    <TableHead className="font-bold text-foreground">Phone</TableHead>
                    <TableHead className="font-bold text-foreground">Type</TableHead>
                    <TableHead className="cursor-pointer hover:text-teal-600 transition-colors font-bold text-foreground" onClick={() => handleSort('timestamp')}><div className="flex items-center gap-2">Date & Time <ArrowUpDown className="w-3 h-3" /></div></TableHead>
                    <TableHead className="font-bold text-foreground">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 cursor-help">
                              Approved Time (min) <Info className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Duration approved by the owner in integer minutes</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:text-teal-600 transition-colors font-bold text-foreground" onClick={() => handleSort('statusPriority')}><div className="flex items-center gap-2">Status <ArrowUpDown className="w-3 h-3" /></div></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {paginatedData.map((req, idx) => (
                      <motion.tr key={req.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className={`group border-b border-border transition-colors hover:bg-muted/30 ${req.status === 'KEY_NOT_RETURNED' ? 'bg-rose-50/50 dark:bg-rose-950/20' : idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                        <TableCell className="py-4 font-bold text-foreground">{req.name}</TableCell>
                        <TableCell className="font-mono text-muted-foreground text-sm font-medium">{req.maskedPhone}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            req.type === 'Pre-Approved' ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                            req.type === 'Pre-Approval Expired' ? 'bg-gray-100 text-gray-700 border-gray-300' :
                            'bg-slate-50 text-slate-700'
                          }>
                            {req.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-foreground">{new Date(req.timestamp).toLocaleDateString()}</div>
                          <div className="text-xs text-muted-foreground font-medium">{new Date(req.timestamp).toLocaleTimeString()}</div>
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {formatApprovedDuration(req.duration)}
                        </TableCell>
                        <TableCell>
                           <Badge variant={
                             req.status === 'KEY_NOT_RETURNED' ? 'danger' : 
                             req.status === 'COMPLETED' ? 'success' : 
                             req.status === 'APPROVED' ? 'default' : 
                             req.status === 'CLOSED_BY_OWNER' ? 'destructive' :
                             req.status === 'REJECTED' ? 'destructive' : 
                             req.status === 'EXPIRED' && req.type === 'Pre-Approval Expired' ? 'destructive' :
                             req.status === 'EXPIRED' ? 'warning' : 'outline'
                           } className={`px-3 py-1 ${req.status==='APPROVED'?'bg-teal-100 text-teal-800 border-teal-200':''} ${req.status==='CLOSED_BY_OWNER'?'bg-red-200 text-red-900 border-red-300':''} ${req.status==='EXPIRED' && req.type === 'Pre-Approval Expired' ? 'bg-red-500 text-white border-red-600' : ''}`}>
                             {req.status.replace(/_/g, ' ')}
                           </Badge>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}

          {processedData.length > 0 && (
            <div className="p-5 border-t border-border bg-muted/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm font-medium text-muted-foreground">
                Showing <span className="font-bold text-foreground">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-bold text-foreground">{Math.min(currentPage * ITEMS_PER_PAGE, processedData.length)}</span> of <span className="font-bold text-foreground">{processedData.length}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="border-2 rounded-xl font-bold">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                </Button>
                <div className="flex items-center gap-1 px-3 bg-background border-2 border-border rounded-xl font-bold text-sm">
                  {currentPage} / {totalPages}
                </div>
                <Button variant="outline" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="border-2 rounded-xl font-bold">
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};

export default RequestHistory;
