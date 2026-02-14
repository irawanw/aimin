'use client';

import { useUser } from '@/lib/user-context';
import { useI18n } from '@/lib/i18n-context';
import Image from 'next/image';

const stats = [
  { label: 'Total Messages', value: '1,234', change: '+12%' },
  { label: 'Active Chats', value: '56', change: '+5%' },
  { label: 'Response Rate', value: '98%', change: '+2%' },
  { label: 'Avg Response Time', value: '1.2s', change: '-8%' },
];

export default function DashboardOverview() {
  const { user } = useUser();
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <div className="text-sm text-gray-500">{s.label}</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs font-medium text-green-600">{s.change} from last month</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">{t.dashboard.plan}</h3>
          <div className="flex items-center justify-between p-4 bg-brand-50 rounded-xl">
            <div>
              <div className="text-lg font-bold text-brand-700 uppercase">{user?.plan}</div>
              <div className="text-sm text-brand-600">
                {user?.plan === 'lite' ? '5 images, Basic analytics' : '20 images, Advanced analytics'}
              </div>
            </div>
            <a href="/dashboard/upgrade" className="btn-primary text-sm !py-1.5 !px-4">{t.dashboard.upgrade}</a>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">{t.dashboard.usage}</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">Messages</span><span className="font-medium">1,234 / 5,000</span></div>
              <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-brand-600 h-2 rounded-full" style={{width: '25%'}} /></div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">Products</span><span className="font-medium">{user?.plan === 'lite' ? '3 / 5' : '12 / 20'}</span></div>
              <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-brand-600 h-2 rounded-full" style={{width: '60%'}} /></div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <Image
          src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80"
          alt="Analytics dashboard view"
          width={800}
          height={300}
          className="w-full object-cover rounded-xl"
          loading="lazy"
        />
      </div>
    </div>
  );
}
