const https = require("https");
var fs = require("fs");

const gameUrl = "api.considition.com";
const apiKey = "a0d3d257-6d14-4780-a611-9265f1461d23"; // API-key is sent in mail inbox
/*
const mapFile = "Map-Nottingham.json"; // Change map here
const personalityFile = "personalities.nottingham.json";
const awardsFile = "nottingham.awards.json";


const mapFile = "Map-Gothenburg.json"
const personalityFile = "personalities.json";
const awardsFile = "Awards.json";
*/
const mapFile = "Map-Almhult.json"; // Change map here
const personalityFile = "personalities.nottingham.json";
const awardsFile = "Awards.json";
// Read and parse the map file
let obj = JSON.parse(fs.readFileSync(mapFile, "utf8"));


let parsedData;
try {
    const personalityData = fs.readFileSync(personalityFile, "utf8");
    const normalizedData = personalityData.replace(/\r/g, '').trim();
    parsedData = JSON.parse(normalizedData);
} catch (error) {
    console.error("Error parsing personalities JSON:", error.message);
}

// Load and parse the awards JSON
let awardsData; // Declare awardsData in a broader scope
try {
    const awardsFileData = fs.readFileSync(awardsFile, "utf8");
    const normalizedData = awardsFileData.replace(/\r/g, '').trim();
    const parsedAwardsData = JSON.parse(normalizedData);
    awardsData = parsedAwardsData.Awards; // Assign parsed data to awardsData
} catch (error) {
    console.error("Error parsing Awards JSON:", error.message);
    process.exit(1); // Exit if there’s an error
}

// CHECK BUDGET
const totalLoans = obj.customers.reduce((total, customer) => {
    return total + customer.loan.amount;
}, 0);
if(totalLoans>obj.budget){
    console.log("over budget! ", totalLoans - obj.budget);
} else {
    console.log("within budget!")
}


const gameInput = {
    MapName: obj.name,
    Proposals: [],
    Iterations: [],
};
                       
    const sortedCustomers = obj.customers.map(customer => {
    const personalityKey = customer.personality.charAt(0).toLowerCase() + customer.personality.slice(1);
    const loanAmount = customer.loan.amount;
    const maxInterest = parsedData.Personalities[personalityKey].acceptedMaxInterest;
    const profit = loanAmount * maxInterest * (36/12); 
    const profitToLoanRatio = profit / loanAmount; 

    return { ...customer, profit, profitToLoanRatio };
}).sort((a, b) => b.profitToLoanRatio - a.profitToLoanRatio); // Sort by profit-to-loan ratio

// Add customers to proposals within budget
const budget = obj.budget-500000;
let currentBudget = budget;
sortedCustomers.forEach(customer => {
    const loanAmount = customer.loan.amount;
    const personalityKey = customer.personality.charAt(0).toLowerCase() + customer.personality.slice(1);

    if (currentBudget >= loanAmount) {
        gameInput.Proposals.push({
            CustomerName: customer.name,
            MonthsToPayBackLoan: obj.gameLengthInMonths, 
            YearlyInterestRate: parsedData.Personalities[personalityKey].acceptedMaxInterest
        });
        currentBudget -= loanAmount;
        console.log(`Added ${customer.name} | Current budget: ${currentBudget}`);
    }
});
/*
*/
const actionTypes = ["Award", "Skip"];
const awardTypes = ["IkeaFoodCoupon", "IkeaDeliveryCheck", "IkeaCheck", "GiftCard", "HalfInterestRate",/* "NoInterestRate"*/];

for (let month = 0; month < obj.gameLengthInMonths; month++) {
    const customerActionsDict = {}; 
gameInput.Proposals.forEach(proposal => {
    // Assuming each proposal has a `CustomerName` to match with customer data
    const customer = obj.customers.find(c => c.name === proposal.CustomerName); 
    
    if (customer) {
        const randomAward = awardTypes[Math.floor(Math.random() * awardTypes.length)];
        
        if (month % 3==0) {
            customerActionsDict[customer.name] = {
                Type: "Award",
                Award: randomAward,
            };
        } else {
            /*
            const randomIndex = Math.floor(Math.random() * actionTypes.length);
            const randomType = actionTypes[randomIndex];
            */
            customerActionsDict[customer.name] = {
                Type: "Skip",
                Award: "None",
            };
        }
    }
});


gameInput.Iterations.push(customerActionsDict);
}
/*

// Uncomment this to preview game
/*
 console.log(JSON.stringify(gameInput, null, 2));
 gameInput.Iterations.forEach((element) => {
     console.log(element);
 });
*/

// Setup the request options for API call
const options = {
    hostname: gameUrl,
    path: "/game",
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
    },
};
//console.log("Iternations: ", gameInput.Iterations.length);
//console.log("Profitability: ", customerProfitability);
const totalLoanAmount = sortedCustomers.reduce((sum, customer) => sum + customer.loan.amount, 0);
console.log("Total Loan Amount: ", totalLoanAmount);
//console.log("Left of budget: ", filteredData.budget-totalLoanAmount);

//console.log(filteredData.length)
console.log("Proposals: ", gameInput.Proposals.length)
//console.log("FILTERED:  ",selectedCustomers.length);



const req = https.request(options, (res) => {
    let body = "";
    res.on("data", (chunk) => {
        body += chunk;
        
    });

    res.on("end", () => {
        if (res.statusCode === 200) {
            console.log(JSON.parse(body, null, 2));
        } else {
         
            console.error(`Error: ${res.statusCode} - ${body}`);
        }
    });
});

req.write(JSON.stringify(gameInput));
req.end();