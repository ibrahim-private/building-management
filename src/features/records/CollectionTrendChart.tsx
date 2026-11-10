import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SectionCard } from '@/components/ui/Card';
import type { PeriodCard } from '@/types';
import { formatMoney } from '@/utils/money';

/** Required vs collected per period (oldest → newest). Shown only when it compares 2+ periods. */
export function CollectionTrendChart({ cards }: { cards: PeriodCard[] }) {
  const data = [...cards]
    .reverse()
    .slice(-8)
    .map(({ period, summary }) => ({
      name: period.name,
      required: summary.required / 100,
      collected: summary.collected / 100,
    }));

  if (data.length < 2) return null;

  return (
    <SectionCard title="التحصيل عبر الفترات" description="المطلوب مقابل المحصّل في آخر الفترات.">
      <div className="h-64 w-full" dir="ltr" role="img" aria-label="رسم بياني يقارن المطلوب بالمحصّل في كل فترة">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b855" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} tickFormatter={(v: string) => (v.length > 14 ? `${v.slice(0, 13)}…` : v)} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} width={56} />
            <Tooltip
              formatter={(value: number, name: string) => [formatMoney(Math.round(value * 100)), name]}
              contentStyle={{ fontFamily: 'inherit', direction: 'rtl', borderRadius: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="required" name="المطلوب" fill="#94a3b8" radius={[6, 6, 0, 0]} />
            <Bar dataKey="collected" name="المحصّل" fill="#059669" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}
