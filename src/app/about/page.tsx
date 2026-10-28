import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: {
    absolute: 'About CRMS | Community Resource Mapping in San Policarpo, Eastern Samar',
  },
  description:
    'Learn about the Community Resource Mapping System (CRMS), an academic capstone project for vulnerable citizen registration, community mapping, relief tracking and announcements in San Policarpo, Eastern Samar.',
  alternates: { canonical: '/about' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'About CRMS | San Policarpo, Eastern Samar',
    description:
      'An academic community resource mapping capstone project focused on organized records, relief assistance and mapping for San Policarpo, Eastern Samar.',
    url: '/about',
    type: 'website',
  },
}

const features = [
  {
    heading: 'Community resource mapping',
    description:
      'Interactive mapping supports authorized planning and a clearer view of registered community needs.',
  },
  {
    heading: 'Vulnerable citizen registration',
    description:
      'Role-based workflows help staff manage registrations and review submitted information.',
  },
  {
    heading: 'Relief distribution tracking',
    description:
      'Field workers record relief activities for review, approval, and operational reporting.',
  },
  {
    heading: 'Community announcements and reports',
    description:
      'Announcements, feedback, and reports help authorized users coordinate community services.',
  },
]

export default function AboutCRMSPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white text-slate-900">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
        <nav aria-label="Breadcrumb" className="mb-12 flex items-center gap-3 text-sm">
          <Link href="/" className="font-semibold text-emerald-700 hover:underline">
            CRMS Homepage
          </Link>
          <span aria-hidden="true" className="text-slate-400">/</span>
          <span className="text-slate-600">About CRMS</span>
        </nav>

        <header className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
            San Policarpo, Eastern Samar, Philippines
          </p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
            Community Resource Mapping System (CRMS)
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-700">
            CRMS is an academic capstone project designed to organize community
            information, vulnerable citizen registration, relief distribution
            activities, and geographic mapping for San Policarpo, Eastern Samar.
          </p>
          <p className="mt-4 leading-7 text-slate-600">
            The web-based system supports administrators, field workers, and
            registered citizens through separate role-based experiences.
            Personal records, sensitive map details, and operational dashboards
            are accessible only through authorized accounts.
          </p>
        </header>

        <section aria-labelledby="features-title" className="mt-14">
          <h2 id="features-title" className="text-2xl font-bold text-slate-950">
            What CRMS is designed to do
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {features.map((feature) => (
              <article key={feature.heading} className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">{feature.heading}</h3>
                <p className="mt-2 leading-7 text-slate-600">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="roles-title" className="mt-14 max-w-3xl">
          <h2 id="roles-title" className="text-2xl font-bold text-slate-950">
            Who uses the system?
          </h2>
          <p className="mt-4 leading-7 text-slate-600">
            Administrators manage registrations, approvals, and reporting.
            Field workers record registrations, assistance activity and field
            updates. Registered vulnerable citizens can view information
            available to their accounts, including announcements and relief history.
          </p>
          <p className="mt-4 leading-7 text-slate-600">
            This informational page describes the capstone project. It does not
            publish personal citizen records or provide public access to protected
            municipal workflows.
          </p>
        </section>

        <div className="mt-12 flex flex-wrap gap-4">
          <Link href="/" className="inline-flex rounded-full bg-emerald-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-800">
            Visit CRMS Homepage
          </Link>
          <Link href="/login" className="inline-flex rounded-full border border-emerald-300 bg-white px-6 py-3 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50">
            Access the Portal
          </Link>
        </div>
      </div>
    </main>
  )
}
