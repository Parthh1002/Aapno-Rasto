-- Allow engineers to delete their own pending work order updates (for retake functionality)
CREATE POLICY "Engineers can delete their own pending updates"
ON public.work_order_updates
FOR DELETE
USING (
  engineer_id = auth.uid() 
  AND approval_status = 'pending'
  AND has_role(auth.uid(), 'engineer'::app_role)
);

-- Add comment explaining the photo limit logic
COMMENT ON TABLE public.work_order_updates IS 'Work order updates with proof stages. Working stages (before, wip, after) have a combined limit of 1-5 photos per work order.';