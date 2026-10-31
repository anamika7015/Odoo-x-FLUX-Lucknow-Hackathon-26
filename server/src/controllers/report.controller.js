import { getDashboardReport } from '../services/report.service.js';

export async function dashboard(request, response) {
  const report = await getDashboardReport(request.query);
  response.json({ success: true, data: report, requestId: request.id });
}
