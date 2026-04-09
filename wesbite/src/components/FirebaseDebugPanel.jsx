
import React, { useState, useEffect } from 'react';
import { Activity, Database, AlertCircle, CheckCircle2, XCircle, RefreshCw, Search } from 'lucide-react';
import { diagnoseFirebaseConnection, checkFirebaseConfigStatus } from '@/utils/firebaseStatus';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { database } from '@/config/firebase';
import { ref, get } from 'firebase/database';

const FirebaseDebugPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [configStatus, setConfigStatus] = useState(null);
  
  // Dashboard Request Monitor State
  const [monitorLockboxId, setMonitorLockboxId] = useState('');
  const [monitorRequests, setMonitorRequests] = useState([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const isDev = import.meta.env.DEV;

  useEffect(() => {
    if (isDev) {
      setConfigStatus(checkFirebaseConfigStatus());
    }
  }, [isDev]);

  if (!isDev) return null;

  const runDiagnostics = async () => {
    setStatus('testing');
    const diagResult = await diagnoseFirebaseConnection();
    setResult(diagResult);
    setStatus(diagResult.success ? 'success' : 'error');
  };

  const fetchRequests = async () => {
    if (!monitorLockboxId.trim()) return;
    setIsMonitoring(true);
    try {
      const requestsRef = ref(database, `lockboxes/${monitorLockboxId.trim()}/requests`);
      const snap = await get(requestsRef);
      if (snap.exists()) {
        const data = snap.val();
        const reqList = Object.keys(data).map(key => data[key])
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
          .slice(0, 5); // Last 5 requests
        setMonitorRequests(reqList);
      } else {
        setMonitorRequests([]);
      }
    } catch (err) {
      console.error("Debug Monitor Error:", err);
    } finally {
      setIsMonitoring(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-50 p-3 bg-indigo-900 text-white rounded-full shadow-[0_0_15px_rgba(79,70,229,0.5)] hover:bg-indigo-800 transition-colors border border-indigo-500"
        title="Open Firebase Debugger"
      >
        <Activity className="w-6 h-6 animate-pulse" />
      </button>
    );
  }

  return (
    <Card className="fixed bottom-4 left-4 z-50 w-96 bg-slate-900 border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
      <div className="p-3 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-purple-400" />
          Debug & Monitor
        </h3>
        <button 
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-white"
        >
          &times;
        </button>
      </div>
      
      <div className="p-4 space-y-4 text-xs overflow-y-auto custom-scrollbar">
        {/* Config Status */}
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Init Status:</span>
          {configStatus?.isReady ? (
            <span className="text-green-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Ready
            </span>
          ) : (
            <span className="text-red-400 flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Error
            </span>
          )}
        </div>

        {/* Database URL */}
        <div className="space-y-1">
          <span className="text-slate-400 block">Database URL:</span>
          <code className="block bg-slate-950 p-1.5 rounded text-slate-300 break-all border border-slate-800">
            {configStatus?.databaseURL || 'Not Configured'}
          </code>
        </div>

        {/* REQUEST MONITORING TOOL */}
        <div className="mt-4 pt-4 border-t border-slate-700">
          <h4 className="text-indigo-300 font-bold mb-2 flex items-center gap-2">
            <Search className="w-3 h-3"/> Request Monitor
          </h4>
          <div className="flex gap-2 mb-3">
            <Input 
              placeholder="Lockbox ID..." 
              value={monitorLockboxId}
              onChange={(e) => setMonitorLockboxId(e.target.value)}
              className="bg-slate-950 border-slate-700 h-8 text-xs text-white"
            />
            <Button size="sm" onClick={fetchRequests} disabled={isMonitoring} className="h-8 bg-indigo-600 hover:bg-indigo-500">
              <RefreshCw className={`w-3 h-3 ${isMonitoring ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className="space-y-2">
            {monitorRequests.length === 0 && !isMonitoring && (
              <p className="text-slate-500 italic">No requests found</p>
            )}
            {monitorRequests.map(req => (
              <div key={req.id} className="bg-slate-800 p-2 rounded border border-slate-700">
                <div className="flex justify-between font-mono">
                  <span className="text-indigo-400" title={req.id}>{req.id.substring(0,8)}...</span>
                  <span className={`font-bold ${
                    req.status === 'PENDING' ? 'text-yellow-400' :
                    req.status === 'APPROVED' ? 'text-green-400' :
                    req.status === 'CLOSED_BY_OWNER' ? 'text-red-400' : 'text-slate-400'
                  }`}>
                    {req.status}
                  </span>
                </div>
                <div className="flex justify-between mt-1 text-[10px]">
                  <span className="text-slate-400">cByOwner: {req.closedByOwner ? 'true' : 'false'}</span>
                  <span className="text-slate-500">{new Date(req.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Last Result */}
        {result && (
          <div className={`p-2 rounded border mt-4 ${result.success ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
            <div className="flex items-center gap-2 mb-1">
              {result.success ? (
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400" />
              )}
              <span className={`font-semibold ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                {result.message}
              </span>
            </div>
            <p className="text-slate-400 pl-6">{result.details}</p>
          </div>
        )}

        <Button 
          size="sm" 
          onClick={runDiagnostics} 
          disabled={status === 'testing'}
          className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 mt-2"
        >
          {status === 'testing' ? 'Testing Connection...' : 'Test Write Connection'}
        </Button>
      </div>
    </Card>
  );
};

export default FirebaseDebugPanel;
