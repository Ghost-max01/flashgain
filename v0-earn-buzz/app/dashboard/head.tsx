export default function Head() {
  const site = "https://helpinghands.money"
  const title = "Dashboard — Flash Gain";
  const description =
    "Your Flash Gain dashboard — view balance, claim rewards, and manage your account.";
  const image = `${site}/dashboard-3.jpg`

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:secure_url" content={image} />
      <meta property="og:image:type" content="image/jpeg" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="Flash Gain — Dashboard preview" />
      <link rel="image_src" href={image} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={`${site}/dashboard`} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </>
  )
}
