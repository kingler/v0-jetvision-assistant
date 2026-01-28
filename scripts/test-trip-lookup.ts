import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findTripData() {
  console.log('Looking up trip ID: BAP6QE...\n');

  // Find request by trip ID
  const { data: requests, error: reqError } = await supabase
    .from('requests')
    .select('id, avinode_trip_id, avinode_rfq_id, departure_airport, arrival_airport, departure_date, passengers, status, iso_agent_id, client_profile_id')
    .or('avinode_trip_id.eq.BAP6QE,avinode_rfq_id.eq.BAP6QE')
    .limit(5);
  
  if (reqError) console.error('Request error:', reqError);
  console.log('=== Requests found ===');
  console.log(JSON.stringify(requests, null, 2));

  // Check quotes with aircraft info
  if (requests && requests.length > 0) {
    const requestId = requests[0].id;
    const { data: quotes, error: quoteError } = await supabase
      .from('quotes')
      .select('id, avinode_quote_id, operator_name, aircraft_type, aircraft_tail_number, total_price, base_price, fees, taxes, status, schedule, aircraft_details')
      .eq('request_id', requestId)
      .limit(20);
    
    if (quoteError) console.error('Quotes error:', quoteError);
    console.log('\n=== Quotes for this request ===');
    console.log(JSON.stringify(quotes, null, 2));

    // Find Challenger specifically
    const challengerQuote = quotes?.find(q => 
      q.aircraft_type?.toLowerCase().includes('challenger') ||
      q.aircraft_type?.toLowerCase().includes('cl-600') ||
      q.aircraft_type?.toLowerCase().includes('601')
    );
    if (challengerQuote) {
      console.log('\n=== Challenger 600/601 Quote Found ===');
      console.log(JSON.stringify(challengerQuote, null, 2));
    } else {
      console.log('\n=== No Challenger quote found, showing all aircraft types ===');
      quotes?.forEach(q => console.log(`- ${q.aircraft_type} (${q.operator_name})`));
    }

    // Get client info
    if (requests[0].client_profile_id) {
      const { data: client, error: clientError } = await supabase
        .from('client_profiles')
        .select('id, first_name, last_name, email, company_name, phone')
        .eq('id', requests[0].client_profile_id)
        .single();
      
      if (clientError) console.error('Client error:', clientError);
      console.log('\n=== Client Profile ===');
      console.log(JSON.stringify(client, null, 2));
    }
  }
}

async function findProposalData() {
  console.log('\n=== Looking for proposals for trip BAP6QE ===');

  // First get the request ID
  const { data: requests } = await supabase
    .from('requests')
    .select('id')
    .eq('avinode_trip_id', 'BAP6QE')
    .limit(1);

  if (!requests || requests.length === 0) {
    console.log('No request found for trip BAP6QE');
    return;
  }

  const requestId = requests[0].id;
  console.log('Request ID:', requestId);

  // Find proposals for this request
  const { data: proposals, error: propError } = await supabase
    .from('proposals')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false });

  if (propError) {
    console.error('Proposal error:', propError);
    return;
  }

  console.log('\n=== Proposals Found ===');
  console.log('Count:', proposals?.length || 0);

  if (proposals && proposals.length > 0) {
    proposals.forEach((p, i) => {
      console.log(`\n--- Proposal ${i + 1} ---`);
      console.log('ID:', p.id);
      console.log('Status:', p.status);
      console.log('Client Name:', p.client_name);
      console.log('Client Email:', p.client_email);
      console.log('Quote ID:', p.quote_id);
      console.log('Aircraft Type:', p.aircraft_type);
      console.log('Total Amount:', p.total_amount);
      console.log('Currency:', p.currency);
      console.log('Created:', p.created_at);
      console.log('Sent At:', p.sent_at);
      console.log('File URL:', p.file_url);
    });

    // Output full JSON of first proposal for contract generation
    console.log('\n=== Full Proposal Data (for contract) ===');
    console.log(JSON.stringify(proposals[0], null, 2));
  }
}

async function findAllRecentProposals() {
  console.log('\n=== Recent Proposals (last 10) ===');

  // Correct column names: sent_to_name, sent_to_email (not client_name/email)
  // No aircraft_type in proposals - need to join with quotes
  const { data: proposals, error } = await supabase
    .from('proposals')
    .select(`
      id,
      proposal_number,
      request_id,
      quote_id,
      status,
      sent_to_name,
      sent_to_email,
      total_amount,
      final_amount,
      created_at,
      sent_at,
      file_url,
      title,
      metadata
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching proposals:', error);
    return;
  }

  console.log('Total recent proposals:', proposals?.length || 0);

  for (const p of proposals || []) {
    console.log('\n--- Proposal ---');
    console.log('ID:', p.id);
    console.log('Number:', p.proposal_number);
    console.log('Title:', p.title);
    console.log('Request ID:', p.request_id);
    console.log('Quote ID:', p.quote_id);
    console.log('Status:', p.status);
    console.log('Client:', p.sent_to_name, '<' + p.sent_to_email + '>');
    console.log('Amount:', p.total_amount || p.final_amount);
    console.log('Created:', p.created_at);
    console.log('Sent:', p.sent_at);
    console.log('File URL:', p.file_url);

    // Get quote details if quote_id exists
    if (p.quote_id) {
      const { data: quote } = await supabase
        .from('quotes')
        .select('aircraft_type, operator_name, total_price')
        .eq('id', p.quote_id)
        .single();
      if (quote) {
        console.log('Aircraft:', quote.aircraft_type);
        console.log('Operator:', quote.operator_name);
        console.log('Quote Price:', quote.total_price);
      }
    }

    // Check metadata for additional info
    if (p.metadata) {
      console.log('Metadata:', JSON.stringify(p.metadata, null, 2));
    }
  }

  // Output full data of most recent sent proposal
  const sentProposal = proposals?.find(p => p.status === 'sent');
  if (sentProposal) {
    console.log('\n=== Most Recent SENT Proposal (Full Data) ===');
    console.log(JSON.stringify(sentProposal, null, 2));
  }
}

async function checkMessagesAndMetadata() {
  console.log('\n=== Checking Messages for Proposal Data ===');

  // Get the request
  const { data: requests } = await supabase
    .from('requests')
    .select('id, metadata')
    .eq('avinode_trip_id', 'BAP6QE')
    .limit(1);

  if (!requests || requests.length === 0) {
    console.log('No request found');
    return;
  }

  const requestId = requests[0].id;
  console.log('Request ID:', requestId);
  console.log('Request Metadata:', JSON.stringify(requests[0].metadata, null, 2));

  // Check messages for this request's conversation
  const { data: messages, error: msgErr } = await supabase
    .from('messages')
    .select('id, content_type, content, rich_content, created_at')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (msgErr) {
    console.error('Messages error:', msgErr);
  } else {
    console.log('\n=== Messages for this request ===');
    console.log('Count:', messages?.length || 0);
    messages?.forEach((m, i) => {
      console.log(`\n--- Message ${i + 1} ---`);
      console.log('Type:', m.content_type);
      console.log('Content preview:', m.content?.substring(0, 200));
      if (m.rich_content) {
        console.log('Rich content:', JSON.stringify(m.rich_content, null, 2).substring(0, 500));
      }
    });
  }

  // Also check conversations table
  const { data: conversations, error: convErr } = await supabase
    .from('conversations')
    .select('id, request_id, metadata, last_message_at')
    .eq('request_id', requestId)
    .limit(5);

  if (!convErr && conversations) {
    console.log('\n=== Conversations ===');
    conversations.forEach(c => {
      console.log('Conversation ID:', c.id);
      console.log('Metadata:', JSON.stringify(c.metadata, null, 2));
    });
  }
}

async function getProposalFromMessage() {
  console.log('\n=== Getting Full Proposal Data from Message ===');

  const { data: requests } = await supabase
    .from('requests')
    .select('id')
    .eq('avinode_trip_id', 'BAP6QE')
    .limit(1);

  if (!requests || requests.length === 0) return;

  const requestId = requests[0].id;

  // Get the proposal_shared message
  const { data: proposalMessage, error } = await supabase
    .from('messages')
    .select('*')
    .eq('request_id', requestId)
    .eq('content_type', 'proposal_shared')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n=== PROPOSAL DATA FROM MESSAGE ===');
  console.log(JSON.stringify(proposalMessage, null, 2));

  // Extract the key data
  const richContent = proposalMessage.rich_content as Record<string, unknown>;
  const proposalSent = richContent?.proposalSent as Record<string, unknown>;

  if (proposalSent) {
    console.log('\n=== Extracted Proposal Info ===');
    console.log('Client Name:', (proposalSent.client as Record<string, string>)?.name);
    console.log('Client Email:', (proposalSent.client as Record<string, string>)?.email);
    console.log('Proposal ID:', proposalSent.proposalId);
    console.log('PDF URL:', proposalSent.pdfUrl);
    console.log('Pricing:', JSON.stringify(proposalSent.pricing));
    console.log('Flight Details:', JSON.stringify(proposalSent.flightDetails));

    // Write to a file for use in contract generation
    const fs = await import('fs');
    fs.writeFileSync(
      'test-output/proposal-data-bap6qe.json',
      JSON.stringify({ proposalMessage, proposalSent }, null, 2)
    );
    console.log('\nFull data saved to: test-output/proposal-data-bap6qe.json');
  }
}

async function getQuoteFromWebhook() {
  console.log('\n=== Getting Quote Data from Webhook Events ===');

  // Get webhook events for BAP6QE trip
  const { data: events, error } = await supabase
    .from('avinode_webhook_events')
    .select('*')
    .eq('avinode_trip_id', 'BAP6QE')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    // Try alternative query - check raw_payload
    const { data: allEvents } = await supabase
      .from('avinode_webhook_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (allEvents) {
      const bap6qeEvents = allEvents.filter((e: Record<string, unknown>) => {
        const payload = e.raw_payload as Record<string, unknown>;
        return payload?.trip_id === 'BAP6QE' ||
          JSON.stringify(e).includes('BAP6QE');
      });

      console.log('Found events via search:', bap6qeEvents.length);
      if (bap6qeEvents.length > 0) {
        // Find Challenger quote
        const challengerEvent = bap6qeEvents.find((e: Record<string, unknown>) =>
          JSON.stringify(e).toLowerCase().includes('challenger')
        );
        if (challengerEvent) {
          console.log('\n=== Challenger Quote Event ===');
          console.log(JSON.stringify(challengerEvent, null, 2));

          // Save for contract generation
          const fs = await import('fs');
          fs.writeFileSync(
            'test-output/challenger-quote-bap6qe.json',
            JSON.stringify(challengerEvent, null, 2)
          );
        }
      }
    }
    return;
  }

  console.log('Webhook events found:', events?.length || 0);

  // Find Challenger quote
  const challengerEvent = events?.find(e =>
    JSON.stringify(e).toLowerCase().includes('challenger')
  );

  if (challengerEvent) {
    console.log('\n=== Challenger Quote Event ===');
    console.log(JSON.stringify(challengerEvent, null, 2));
  }
}

findTripData()
  .then(findProposalData)
  .then(findAllRecentProposals)
  .then(checkMessagesAndMetadata)
  .then(getProposalFromMessage)
  .then(getQuoteFromWebhook)
  .catch(console.error);
