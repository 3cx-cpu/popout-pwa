// backend/services/tekion.service.js

const axios = require('axios');

const TEKION_API_BASE = 'https://api.bozarthconnect.com';
const OPERATOR_EMAIL = 'jnegri@edbozarth.com';
const TEKION_API_KEY = '6E9ViMUn5O2LBBcFQ5MIxKkzMdsC74c8wwtAeQdh'; // Add this

async function getTekionCustomerByPhone(phoneNumber) {
  try {
    console.log(`🔍 Fetching Tekion customer for phone: ${phoneNumber}`);
    
    const response = await axios.post(`${TEKION_API_BASE}/lookup`, {
      phone: phoneNumber,
      operatorEmail: OPERATOR_EMAIL
    }, {
      headers: {
        'x-api-key': TEKION_API_KEY,  // Add the API key header
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (response.data && response.data.Tekion && response.data.Tekion.customer) {
      const customer = response.data.Tekion.customer;
      console.log(`✅ Found Tekion customer: ${customer.customerId}`);
      return customer;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error fetching Tekion customer:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return null;
  }
}

async function getTekionDetailedData(customerId) {
  try {
    console.log(`📋 Fetching detailed Tekion data for customer: ${customerId}`);
    
    const response = await axios.post(`${TEKION_API_BASE}/lookup`, {
      operatorEmail: OPERATOR_EMAIL,
      customer_id: customerId,
      include: ['deals', 'ros']
    }, {
      headers: {
        'x-api-key': TEKION_API_KEY,  // Add the API key header
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    if (response.data && response.data.Tekion) {
      const tekionData = response.data.Tekion;
      
      // Process repair orders to extract the important data
      const processedData = {
        customerId: tekionData.customer,
        deals: tekionData.deals || [],
        repairOrders: processTekionRepairOrders(tekionData.repair_orders || [])
      };
      
      console.log(`✅ Processed ${processedData.repairOrders.length} repair orders`);
      return processedData;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error fetching detailed Tekion data:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return null;
  }
}

function processTekionRepairOrders(repairOrders) {
  return repairOrders.map(ro => {
    // Extract the most recent/relevant RO data
    const processedJobs = (ro.jobs || []).map(job => ({
      jobNumber: job.job_no,
      type: job.job_type,
      description: job.concern_description,
      status: job.status,
      completedTime: job.completed_time,
      laborAmount: job.labor_amount,
      partsAmount: job.parts_amount,
      totalPrice: job.job_price,
      // Extract tech stories from operations
      techStories: (job.operations || []).map(op => ({
        description: op.opcode_description,
        techStory: op.tech_story,
        laborPrice: op.labor_price,
        partsPrice: op.parts_amount,
        technician: op.technicians?.[0] ? {
          firstName: op.technicians[0].technician_first_name,
          lastName: op.technicians[0].technician_last_name
        } : null
      })),
      // Extract parts information
      parts: (job.operations || []).flatMap(op => 
        (op.parts || []).map(part => ({
          name: part.part_name,
          quantity: part.quantity,
          unitPrice: part.unit_price,
          totalPrice: part.total_price
        }))
      )
    }));

    return {
      roNumber: ro.ro_number,
      roId: ro.ro_id,
      status: ro.ro_status,
      createdTime: ro.ro_created_time,
      closedTime: ro.ro_closed_time,
      promiseTime: ro.promise_time,
      
      // Vehicle info
      vehicle: {
        vin: ro.vin,
        year: ro.year,
        make: ro.make,
        model: ro.model,
        trim: ro.trim,
        mileageIn: ro.odometer_in,
        mileageOut: ro.odometer_out
      },
      
      // Financial summary
      financial: {
        laborTotal: ro.cp_ro_labor_total_amt,
        partsTotal: ro.cp_ro_parts_total_amt,
        tax: ro.cp_tax_amt,
        totalAmount: ro.cp_total_amt,
        discount: ro.cp_total_discount_amt
      },
      
      // Customer info (for this specific RO)
      customer: {
        firstName: ro.billing_customer_first_name || ro.customer_first_name,
        lastName: ro.billing_customer_last_name || ro.customer_last_name,
        email: ro.billing_customer_email || ro.customer_email,
        phone: ro.billing_customer_mobile_phone || ro.customer_mobile_phone,
        address: {
          street: ro.customer_address_line_1,
          city: ro.customer_city,
          state: ro.customer_state,
          zip: ro.customer_postal_code
        }
      },
      
      // Jobs with all details
      jobs: processedJobs,
      jobCount: ro.job_count
    };
  });
}

async function fetchTekionDataProgressive(phoneNumber, sendProgressiveUpdate) {
  try {
    // Stage 1: Get customer ID
    const customer = await getTekionCustomerByPhone(phoneNumber);
    
    if (!customer) {
      console.log('❌ No Tekion customer found');
      return null;
    }

    // Send customer info as first update
    sendProgressiveUpdate('tekion_customer', {
      customerId: customer.customerId,
      displayName: customer.displayName,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.primaryPhone || customer.workPhone
    });

    // Stage 2: Get detailed data
    const detailedData = await getTekionDetailedData(customer.customerId);
    
    if (detailedData) {
      // Send complete Tekion data
      sendProgressiveUpdate('tekion_complete', detailedData);
    }

    return detailedData;
  } catch (error) {
    console.error('❌ Error in Tekion progressive fetch:', error.message);
    return null;
  }
}

module.exports = {
  getTekionCustomerByPhone,
  getTekionDetailedData,
  fetchTekionDataProgressive
};