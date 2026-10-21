import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '7115056075 HW2｜零售需求多元線性回歸分析',
  description: '使用多元線性回歸模型預測 Kaggle 零售商店商品需求量（Demand），依據 CRISP-DM 流程建立包含 F-score 特徵選擇、95% 預測區間與即時情境試算之互動式成果網站。',
  keywords: ['機器學習', '多元線性回歸', 'CRISP-DM', '零售需求預測', 'Kaggle', '特徵選擇', '預測區間', '7115056075'],
  authors: [{ name: '7115056075' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0e17',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body className="antialiased">{children}</body>
    </html>
  );
}
