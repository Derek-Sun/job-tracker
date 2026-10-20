import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { dbGetJob, dbGetResumeLabel, dbGetLogEntries } from '@/lib/db';
import { JobDetail } from './JobDetail';

export default async function JobDetailPage({ params }: PageProps<'/jobs/[id]'>) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { id } = await params;
  const job = await dbGetJob(id, session.userId);
  if (!job) redirect('/');

  const [resume, logEntries] = await Promise.all([
    job.resumeId ? dbGetResumeLabel(job.resumeId, session.userId) : Promise.resolve(undefined),
    dbGetLogEntries(id, session.userId),
  ]);

  return <JobDetail job={job} resume={resume} logEntries={logEntries} />;
}
