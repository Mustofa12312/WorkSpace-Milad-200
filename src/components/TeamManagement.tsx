import { useState } from 'react';
import { Search, UserPlus, MoreHorizontal, Mail, Shield, ShieldCheck, User, Clock } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Role = 'Owner' | 'Admin' | 'Manager' | 'Member';
type Status = 'Active' | 'Pending' | 'Suspended';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: Status;
  lastActive: string;
}

const MOCK_TEAM: TeamMember[] = [
  { id: '1', name: 'Mustofa (You)', email: 'mustofa@workspace.com', role: 'Owner', status: 'Active', lastActive: 'Just now' },
  { id: '2', name: 'Ahmad F.', email: 'ahmad@workspace.com', role: 'Admin', status: 'Active', lastActive: '2 mins ago' },
  { id: '3', name: 'Hasan S.', email: 'hasan@workspace.com', role: 'Manager', status: 'Active', lastActive: '1 hour ago' },
  { id: '4', name: 'Fatimah Z.', email: 'fatimah@workspace.com', role: 'Member', status: 'Active', lastActive: 'Yesterday' },
  { id: '5', name: 'Budi T.', email: 'budi@workspace.com', role: 'Member', status: 'Pending', lastActive: '-' },
];

export default function TeamManagement() {
  const [members] = useState<TeamMember[]>(MOCK_TEAM);

  const getRoleIcon = (role: Role) => {
    switch (role) {
      case 'Owner': return <ShieldCheck size={14} className="text-purple-600" />;
      case 'Admin': return <Shield size={14} className="text-blue-600" />;
      case 'Manager': return <User size={14} className="text-amber-600" />;
      default: return <User size={14} className="text-slate-400" />;
    }
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'Owner': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Admin': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Manager': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (status: Status) => {
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
          <button className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-full font-medium flex items-center gap-2 shadow-sm shadow-primary-500/30 transition-all hover:shadow-md hover:-translate-y-0.5">
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
              {members.map((member) => (
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
    </div>
  );
}
