using AyHali.Api.Entities;
using AyHali.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AyHali.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ColorsController(LookupService lookupService) : LookupController<Color>(lookupService);
