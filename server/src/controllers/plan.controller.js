import * as plans from '../services/plan.service.js';
export async function createPlan(request, response) { const plan = await plans.createPlan(request.body); response.status(201).json({ success: true, data: { plan }, requestId: request.id }); }
export async function listPlans(request, response) { const result = await plans.listPlans(request.query); response.status(200).json({ success: true, data: { plans: result.items }, meta: result.meta, requestId: request.id }); }
export async function getPlan(request, response) { const plan = await plans.getPlan(request.params.planId); response.status(200).json({ success: true, data: { plan }, requestId: request.id }); }
export async function updatePlan(request, response) { const plan = await plans.updatePlan(request.params.planId, request.body); response.status(200).json({ success: true, data: { plan }, requestId: request.id }); }
