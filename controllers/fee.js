const Fees = require('../models/feeconfig');
const sequelize = require('../util/database');

exports.createFee = async (req, res, next) => {
  const FeeConfigurationSpec = req.body.FeeConfigurationSpec;
  const splitfees = FeeConfigurationSpec.split('\n');
  let params = [];
  for (let feeconfigs of splitfees) {
    splitfeeconfig = feeconfigs.split(' ');
    var feefields = {
      feeid: splitfeeconfig[0],
      fee_currency: splitfeeconfig[1],
      fee_locale: splitfeeconfig[2],
      fee_entity_property: splitfeeconfig[3],
      fee_type: splitfeeconfig[6],
      fee_value: splitfeeconfig[7],
      createdAt: sequelize.NOW,
      updatedAt: sequelize.NOW,
    };
    params.push(feefields);
  }
  await Fees.bulkCreate(params)
    .then((result) => {
      res.status(200).json({
        status: 'ok',
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      res.status(500).json({
        status: 'Duplicate Entry, Remove saved configuration GET /removefees',
      });
    });
};

exports.removeFees = (req, res, next) => {
  Fees.truncate();
  res.status(200).json({
    message: 'Fees Deleted successfully',
  });
};

exports.computeFees = async (req, res, next) => {
  const payload = req.body;

  const amt = payload.Amount;
  const currency = payload.Currency;
  const currencycountry = payload.CurrencyCountry;
  const bearfees = payload.Customer.BearsFee;
  const issuer = payload.PaymentEntity.Issuer;
  const brand = payload.PaymentEntity.Brand;
  const ptype = payload.PaymentEntity.Type;
  const pcountry = payload.PaymentEntity.Country;

  //check if transaction is local or international
  let locale;
  if (currencycountry === pcountry) {
    locale = 'LOCL';
  } else {
    locale = 'INTL';
  }
  //check for USSD transactions
  let qwhere;
  if (ptype === 'USSD') {
    querystring =
      "SELECT   SUBSTRING_INDEX( fee_entity_property, '(', 1 ) as entype  from feeconfigs  where (fee_entity_property LIKE  :ptype or LEFT(fee_entity_property, 1) = '*') and (fee_locale = :locale or fee_locale = '*') and (fee_entity_property LIKE  :issuer or   LEFT(fee_entity_property, 1) = '*')";
    queryfeestring =
      "SELECT  feeid, fee_type, fee_value from feeconfigs  where (fee_entity_property LIKE  :ptype or LEFT(fee_entity_property, 1) = '*') and (fee_locale = :locale or fee_locale = '*') and   SUBSTRING_INDEX( fee_entity_property, '(', 1 ) = :dactual and (fee_entity_property LIKE  :issuer or   LEFT(fee_entity_property, 1) = '*')";
  } else {
    querystring =
      "SELECT   SUBSTRING_INDEX( fee_entity_property, '(', 1 ) as entype  from feeconfigs  where (fee_entity_property LIKE  :ptype or LEFT(fee_entity_property, 1) = '*') and (fee_locale = :locale or fee_locale = '*')";
    queryfeestring =
      "SELECT  feeid, fee_type, fee_value from feeconfigs  where (fee_entity_property LIKE  :ptype or LEFT(fee_entity_property, 1) = '*') and (fee_locale = :locale or fee_locale = '*') and   SUBSTRING_INDEX( fee_entity_property, '(', 1 ) = :dactual";
  }

  await Fees.count({
    where: {
      fee_currency: currency,
    },
    attributes: ['fee_currency'],
  }).then(async function (result) {
    if (result === 0) {
      res.status(404).json({
        Error: 'No fee configuration for ' + currency + ' transactions.',
      });
      return;
    } else {
      await sequelize
        .query(querystring, {
          replacements: {
            ptype: ptype + '%',
            locale: locale,
            issuer: '%' + issuer + '%',
          },
          type: sequelize.QueryTypes.SELECT,
        })
        .then(async function getfeestype(feetypes) {
          let dactual;
          if (
            (getfeetype =
              (await JSON.stringify(feetypes).includes(ptype)) === true)
          ) {
            dactual = ptype;
          } else {
            dactual = feetypes[0].entype;
          }
          await sequelize
            .query(queryfeestring, {
              replacements: {
                ptype: ptype + '%',
                locale: locale,
                dactual: dactual,
                issuer: '%' + issuer + '%',
              },
              type: sequelize.QueryTypes.SELECT,
            })
            .then(function (feevalues) {
              //compute fees
              let feetype = feevalues[0].fee_type;
              let feevalue = feevalues[0].fee_value;
              let feeid = feevalues[0].feeid;
              let pf,
                flat,
                percentage,
                feeamt,
                chargeamt = 0,
                settlement;
              if (feetype === 'FLAT_PERC') {
                pf = feevalue.split(':');
                flat = parseInt(pf[0]);
                percentage = pf[1];
                feeamt = amt * percentage * 0.01 + flat;
              } else if (feetype === 'PERC') {
                percentage = feevalue;
                feeamt = amt * percentage * 0.01;
              } else if (feetype === 'FLAT') {
                flat = feevalue;
                feeamt = amt + flat;
              } else {
                res.status(404).json({
                  Error: 'Error in  Fee Computation',
                });
              }
              //check for who bear fees
              if (bearfees === true) {
                chargeamt = feeamt + amt;
                settlement = amt;
              } else {
                chargeamt = amt;
                settlement = amt - feeamt;
              }

              res.status(200).json({
                AppliedFeeID: feeid,
                AppliedFeeValue: feeamt,
                ChargeAmount: chargeamt,
                SettlementAmount: settlement,
              });
            })
            .catch((err) => {
              if (!err.statusCode) {
                err.statusCode = 500;
              }
              res.status(400).json({
                status: 'Error in  Fee Computation',
              });
            });
        });
    }
  });
};
