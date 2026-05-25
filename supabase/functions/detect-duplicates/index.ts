import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Configuration constants
const EXACT_DUPLICATE_RADIUS_METERS = 5;
const SIMILAR_DUPLICATE_RADIUS_METERS = 20;
const IMAGE_HASH_SIMILARITY_THRESHOLD = 95;
const AI_SIMILARITY_THRESHOLD = 85;

interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateType: 'exact' | 'similar' | null;
  masterIssueId: string | null;
  matchConfidence: number;
  matchedAgainstIssueId: string | null;
  matchReason: string[];
}

// Simple perceptual hash comparison (Hamming distance)
function calculateHashSimilarity(hash1: string | null, hash2: string | null): number {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return 0;
  
  let matchingBits = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] === hash2[i]) matchingBits++;
  }
  return (matchingBits / hash1.length) * 100;
}

// Generate a simple perceptual hash from image URL using color averaging
async function generateImageHash(imageUrl: string): Promise<string | null> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(imageUrl);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  } catch (error) {
    console.error('Error generating image hash:', error);
    return null;
  }
}

// AI-based image similarity check using Lovable AI
async function checkAISimilarity(
  imageUrl1: string,
  imageUrl2: string,
  category: string
): Promise<{ similarity: number; reasoning: string }> {
  try {
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.log('LOVABLE_API_KEY not available, skipping AI similarity check');
      return { similarity: 0, reasoning: 'AI check unavailable' };
    }

    const response = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are an expert at detecting duplicate civic complaints. Compare these two images of ${category} issues and determine if they show the SAME real-world problem (same pothole, same broken streetlight, etc.).

Respond with ONLY a JSON object in this exact format:
{"similarity": <number 0-100>, "reasoning": "<brief explanation>"}

Where:
- similarity: 0-30 = completely different issues
- similarity: 31-60 = somewhat similar but likely different
- similarity: 61-85 = likely the same issue from different angles
- similarity: 86-100 = definitely the same issue`
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl1 }
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl2 }
              }
            ]
          }
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', await response.text());
      return { similarity: 0, reasoning: 'AI check failed' };
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        similarity: parsed.similarity || 0,
        reasoning: parsed.reasoning || 'Unknown'
      };
    }
    
    return { similarity: 0, reasoning: 'Could not parse AI response' };
  } catch (error) {
    console.error('AI similarity check error:', error);
    return { similarity: 0, reasoning: 'AI check error' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // --- Authentication Check ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log(`Authenticated user ${userId} calling detect-duplicates`);

    // Use service role client for privileged operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { complaintId, lat, lng, imageUrl, category, subCategory } = await req.json();

    if (!complaintId || lat === undefined || lng === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: complaintId, lat, lng' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify caller owns the complaint or has admin/engineer role
    const { data: complaint } = await supabase
      .from('complaints')
      .select('user_id')
      .eq('id', complaintId)
      .single();

    if (!complaint) {
      return new Response(
        JSON.stringify({ error: 'Complaint not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isOwner = complaint.user_id === userId;
    const { data: isAdminOrEngineer } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
    const { data: isEngineer } = await supabase.rpc('has_role', { _user_id: userId, _role: 'engineer' });

    if (!isOwner && !isAdminOrEngineer && !isEngineer) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: you do not have access to this complaint' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Checking duplicates for complaint ${complaintId} at (${lat}, ${lng})`);

    // Generate image hash for the new complaint
    const newImageHash = imageUrl ? await generateImageHash(imageUrl) : null;

    // Update the complaint with its image hash
    if (newImageHash) {
      await supabase
        .from('complaints')
        .update({ image_hash: newImageHash })
        .eq('id', complaintId);
    }

    // Step 1: Find nearby complaints using GPS (fast pre-check)
    const { data: nearbyComplaints, error: nearbyError } = await supabase
      .rpc('find_nearby_complaints', {
        p_lat: lat,
        p_lng: lng,
        p_radius_meters: SIMILAR_DUPLICATE_RADIUS_METERS,
        p_exclude_id: complaintId
      });

    if (nearbyError) {
      console.error('Error finding nearby complaints:', nearbyError);
      throw nearbyError;
    }

    if (!nearbyComplaints || nearbyComplaints.length === 0) {
      console.log('No nearby complaints found');
      return new Response(
        JSON.stringify({
          isDuplicate: false,
          duplicateType: null,
          masterIssueId: null,
          matchConfidence: 0,
          matchedAgainstIssueId: null,
          matchReason: []
        } as DuplicateCheckResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${nearbyComplaints.length} nearby complaints`);

    let bestMatch: DuplicateCheckResult = {
      isDuplicate: false,
      duplicateType: null,
      masterIssueId: null,
      matchConfidence: 0,
      matchedAgainstIssueId: null,
      matchReason: []
    };

    for (const nearby of nearbyComplaints) {
      const matchReasons: string[] = [];
      let confidence = 0;

      const isExactGPS = nearby.distance_meters <= EXACT_DUPLICATE_RADIUS_METERS;
      const isSimilarGPS = nearby.distance_meters <= SIMILAR_DUPLICATE_RADIUS_METERS;

      if (isExactGPS) {
        matchReasons.push('gps');
        confidence += 40;
      } else if (isSimilarGPS) {
        matchReasons.push('gps');
        confidence += 25;
      }

      if (nearby.category === category) {
        confidence += 15;
        if (nearby.sub_category === subCategory) {
          confidence += 10;
        }
      }

      if (newImageHash && nearby.image_hash) {
        const hashSimilarity = calculateHashSimilarity(newImageHash, nearby.image_hash);
        if (hashSimilarity >= IMAGE_HASH_SIMILARITY_THRESHOLD) {
          matchReasons.push('image_hash');
          confidence += 35;
        }
      }

      if (isSimilarGPS && !matchReasons.includes('image_hash') && imageUrl) {
        const { data: existingComplaint } = await supabase
          .from('complaints')
          .select('image_url')
          .eq('id', nearby.id)
          .single();

        if (existingComplaint?.image_url) {
          const aiResult = await checkAISimilarity(
            imageUrl,
            existingComplaint.image_url,
            category
          );
          
          if (aiResult.similarity >= AI_SIMILARITY_THRESHOLD) {
            matchReasons.push('ai_similarity');
            confidence += Math.min(35, aiResult.similarity * 0.35);
          }
        }
      }

      if (confidence > bestMatch.matchConfidence) {
        const isExactDuplicate = isExactGPS && 
          (matchReasons.includes('image_hash') || confidence >= 90);
        
        bestMatch = {
          isDuplicate: confidence >= 50,
          duplicateType: isExactDuplicate ? 'exact' : (confidence >= 50 ? 'similar' : null),
          masterIssueId: confidence >= 50 ? nearby.id : null,
          matchConfidence: Math.min(100, Math.round(confidence)),
          matchedAgainstIssueId: nearby.id,
          matchReason: matchReasons
        };
      }
    }

    if (bestMatch.isDuplicate) {
      console.log(`Duplicate detected: ${bestMatch.duplicateType} with confidence ${bestMatch.matchConfidence}%`);
      
      await supabase
        .from('complaints')
        .update({
          is_duplicate: true,
          duplicate_type: bestMatch.duplicateType,
          master_issue_id: bestMatch.masterIssueId,
          match_confidence: bestMatch.matchConfidence,
          matched_against_issue_id: bestMatch.matchedAgainstIssueId,
          match_reason: bestMatch.matchReason
        })
        .eq('id', complaintId);
    }

    return new Response(
      JSON.stringify(bestMatch),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in detect-duplicates:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
