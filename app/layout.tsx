export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
      <title>MAInD - Echoes of Exclusion</title>
      </head>
      <body style={{ backgroundColor: 'black' }}>
        {children}
      </body>
    </html>
  );
}
