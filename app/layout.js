import './globals.css';

export const metadata = {
  title: 'Zadania biura',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
