import { useState } from 'react';
import { Search, UserPlus, MoreHorizontal, Mail, Shield, ShieldCheck, User, Clock } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { useAppStore } from '../store/useAppStore';

export default function TeamManagement() {
  const { team, addTeamMember } = useAppStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMember, setNewMember] = useState({ email: '', role: 'Member' });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.email || newMember.email.trim() === '') return;
    
    addTeamMember({
      id: `usr-${Date.now()}`,
      name: newMember.email.split('@')[0],
      email: newMember.email,
      role: newMember.role,
      status: 'Pending',
      lastActive: '-'
    });
    
    setIsModalOpen(false);
    setNewMember({ email: '', role: 'Member' });
  };

  const getRoleIcon = (role: string = 'Member') => {
    switch (role) {
      case 'Owner': return <ShieldCheck size={14} className="text-purple-600" />;
      case 'Admin': return <Shield size={14} className="text-blue-600" />;
      case 'Manager': return <User size={14} className="text-amber-600" />;
      default: return <User size={14} className="text-slate-400" />;
    }
  };

  const getRoleBadge = (role: string = 'Member') => {
    switch (role) {
      case 'Owner': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Admin': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Manager': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (status: string = 'Pending') => {
    switch (status) {
      case 'Active': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'Pending': return 'bg-orange-50 text-orange-600 border-orange-200';
      case 'Suspended': return 'bg-red-50 text-red-600 border-red-200';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Team Management</h2>
            <p className="text-slate-500 mt-1">Manage members, roles, and organization settings.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-full font-medium flex items-center gap-2 shadow-sm shadow-primary-500/30 transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            <UserPlus size={18} />
            Invite Member
          </button>
        </div>

        {/* Action Bar */}
        <div className="bg-white p-4 rounded-t-2xl border border-slate-200 border-b-0 flex justify-between items-center">
          <div className="flex items-center bg-slate-50 rounded-xl px-4 py-2 w-80 border border-slate-200 focus-within:ring-2 focus-within:ring-primary-500/20 transition-shadow">
            <Search size={16} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              className="bg-transparent border-none outline-none ml-2 w-full text-sm placeholder-slate-400"
            />
          </div>
          <div className="flex gap-2">
            <select className="bg-white border border-slate-200 text-slate-600 text-sm rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary-500/20">
              <option>All Roles</option>
              <option>Admin</option>
              <option>Manager</option>
              <option>Member</option>
            </select>
            <select className="bg-white border border-slate-200 text-slate-600 text-sm rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary-500/20">
              <option>All Status</option>
              <option>Active</option>
              <option>Pending</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white border border-slate-200 rounded-b-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="py-4 px-6">Member</th>
                <th className="py-4 px-6">Role</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Last Active</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {team.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 flex items-center justify-center font-bold text-sm border border-indigo-200">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 text-sm">{member.name}</div>
                        <div className="text-slate-500 text-xs mt-0.5 flex items-center gap-1">
                          <Mail size={12} /> {member.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border", getRoleBadge(member.role))}>
                      {getRoleIcon(member.role)}
                      {member.role}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border", getStatusBadge(member.status))}>
                      {member.status === 'Pending' && <Clock size={10} className="mr-1" />}
                      {member.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-500 font-medium">
                    {member.lastActive}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button className="text-slate-400 hover:text-primary-600 p-2 rounded-lg hover:bg-primary-50 transition-colors opacity-0 group-hover:opacity-100">
                      <MoreHorizontal size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">Invite Team Member</h3>
            </div>
            <form onSubmit={handleInvite} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input type="email" required value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" placeholder="e.g., alex@company.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-white">
                  <option value="Member">Member</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              
              <div className="pt-4 flex gap-3 justify-end">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors shadow-sm shadow-primary-500/30">Send Invite</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
